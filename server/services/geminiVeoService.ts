import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

export interface VeoGenerationRequest {
  prompt: string
  aspectRatio?: '9:16' | '16:9' | '1:1'
  quality?: 'standard' | 'high'
}

export interface VeoTaskStatus {
  operationId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  videoUrl?: string
  error?: string
  engine?: 'veo' | 'visual-synthesis'
  fallbackReason?: string
  prompt: string
  createdAt: number
}

// In-memory store for operations
const activeOperations = new Map<string, VeoTaskStatus>()
const watchdogs = new Map<string, ReturnType<typeof setTimeout>>()

// Hard ceiling so a task can never hang in "processing" forever
const TASK_TTL_MS = 6 * 60 * 1000

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function ffmpegPath() {
  return process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg'
}

function ffprobePath() {
  return ffmpegPath().replace(/ffmpeg(\.exe)?$/, 'ffprobe$1')
}

function failTask(task: VeoTaskStatus, message: string) {
  if (task.status === 'completed' || task.status === 'failed') return
  task.status = 'failed'
  task.error = message
}

function completeTask(task: VeoTaskStatus, videoUrl: string, engine: VeoTaskStatus['engine']) {
  if (task.status === 'failed') return // watchdog fired first; do not resurrect
  task.status = 'completed'
  task.progress = 100
  task.engine = engine
  task.videoUrl = videoUrl
}

function armWatchdog(operationId: string) {
  clearWatchdog(operationId)
  const t = setTimeout(() => {
    const task = activeOperations.get(operationId)
    if (task) {
      failTask(task, 'Generation timed out on the server after 6 minutes. Please try again.')
    }
  }, TASK_TTL_MS)
  watchdogs.set(operationId, t)
}

function clearWatchdog(operationId: string) {
  const t = watchdogs.get(operationId)
  if (t) {
    clearTimeout(t)
    watchdogs.delete(operationId)
  }
}

/**
 * Normalize any generated clip (Veo returns 5-8s, no guaranteed aspect) into
 * an exact 10-second, silent-audio MP4 at the requested dimensions.
 */
function stretchToTenSeconds(
  inputPath: string,
  outputPath: string,
  aspect: '9:16' | '16:9' | '1:1'
): Promise<void> {
  // Probe actual source duration to compute the stretch factor
  let sourceDuration = 8
  try {
    const probe = spawnSync(ffprobePath(), [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      inputPath,
    ])
    const parsed = parseFloat(String(probe.stdout || '').trim())
    if (Number.isFinite(parsed) && parsed > 0.5) sourceDuration = parsed
  } catch {
    // keep default
  }

  const stretch = (10 / sourceDuration).toFixed(6)
  const dims =
    aspect === '16:9' ? { w: 1280, h: 720 } :
    aspect === '1:1' ? { w: 720, h: 720 } :
    { w: 720, h: 1280 }

  const vf = [
    `scale=${dims.w}:${dims.h}:force_original_aspect_ratio=increase`,
    `crop=${dims.w}:${dims.h}`,
    `setpts=PTS*${stretch}`,
    'fps=30',
  ].join(',')

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), [
      '-y',
      '-i', inputPath,
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf', vf,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-t', '10',
      '-c:a', 'aac',
      '-shortest',
      outputPath,
    ])
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += String(d) })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg normalization exited with code ${code}: ${stderr.slice(-400)}`))
    })
  })
}

export const geminiVeoService = {
  /**
   * Start generation request.
   * Uses real Google Veo when an API key is configured, otherwise falls back
   * to the offline visual-synthesis engine.
   */
  async startGeneration(
    req: VeoGenerationRequest,
    outputDir: string
  ): Promise<VeoTaskStatus> {
    const operationId = 'op-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
    const routerKey = process.env.NINEROUTER_API_KEY
    const pixazoKey = process.env.PIXAZO_API_KEY
    const magicHourKey = process.env.MAGICHOUR_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VERTEX_API_KEY

    const task: VeoTaskStatus = {
      operationId,
      status: 'queued',
      progress: 5,
      prompt: req.prompt,
      createdAt: Date.now(),
    }
    activeOperations.set(operationId, task)
    armWatchdog(operationId)

    if (routerKey) {
      this.run9RouterGeneration(operationId, req, outputDir, routerKey)
    } else if (pixazoKey) {
      this.runPixazoGeneration(operationId, req, outputDir, pixazoKey)
    } else if (magicHourKey) {
      this.runMagicHourGeneration(operationId, req, outputDir, magicHourKey)
    } else if (geminiKey) {
      // Fire and forget: the status endpoint reports progress
      this.runRealVeoGeneration(operationId, req, outputDir, geminiKey)
    } else {
      task.fallbackReason = 'No GEMINI_API_KEY configured on the server'
      this.runAIVisualSceneGeneration(operationId, req, outputDir)
    }

    return task
  },

  /**
   * Check operation status
   */
  getStatus(operationId: string): VeoTaskStatus | undefined {
    const task = activeOperations.get(operationId)
    return task ? { ...task } : undefined
  },

  /**
   * 9Router video generation (OpenAI-compatible aggregator).
   * Requires NINEROUTER_BASE_URL, NINEROUTER_API_KEY and NINEROUTER_MODEL.
   */
  async run9RouterGeneration(
    operationId: string,
    req: VeoGenerationRequest,
    outputDir: string,
    apiKey: string
  ) {
    const task = activeOperations.get(operationId)
    if (!task) return

    task.status = 'processing'
    task.progress = 10

    const baseUrl = (process.env.NINEROUTER_BASE_URL || '').replace(/\/+$/, '')
    const model = process.env.NINEROUTER_MODEL || 'veo-3'
    const wanted = req.aspectRatio || '9:16'

    if (!baseUrl) {
      task.fallbackReason = 'NINEROUTER_BASE_URL is not configured'
      console.warn(`[9Router] ${task.fallbackReason} — falling back to visual synthesis`)
      return this.runAIVisualSceneGeneration(operationId, req, outputDir)
    }

    try {
      const response = await fetch(`${baseUrl}/video/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: req.prompt,
          aspect_ratio: wanted,
          duration: 8,
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`)
      }

      const data = (await response.json()) as any

      const pickUrl = (obj: any): string | null =>
        obj?.data?.[0]?.url ||
        obj?.data?.[0]?.video?.url ||
        obj?.video?.url ||
        obj?.url ||
        obj?.output?.[0] ||
        null

      let videoUrl: string | null = pickUrl(data)

      if (!videoUrl) {
        const jobId = data?.id || data?.data?.[0]?.id || data?.task_id || null
        if (!jobId) throw new Error('9Router response contained neither a video URL nor a job id')

        for (let attempt = 0; attempt < 60; attempt++) {
          await sleep(5000)

          const current = activeOperations.get(operationId)
          if (!current || current.status === 'failed') return
          task.progress = Math.min(90, 20 + attempt * 2)

          let poll: any
          try {
            const pollRes = await fetch(`${baseUrl}/video/generations/${jobId}`, {
              headers: { Authorization: `Bearer ${apiKey}` },
              signal: AbortSignal.timeout(20000),
            })
            if (!pollRes.ok) continue
            poll = await pollRes.json()
          } catch {
            continue
          }

          const status = String(poll?.status || poll?.data?.status || '').toLowerCase()
          if (status === 'failed' || poll?.error) {
            throw new Error(poll?.error?.message || String(poll?.error) || '9Router generation failed')
          }

          videoUrl = pickUrl(poll)
          if (videoUrl) break
        }
      }

      if (!videoUrl) throw new Error('9Router polling timed out before returning a video')

      task.progress = 92

      const downloadRes = await fetch(videoUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(120000),
      })
      if (!downloadRes.ok) {
        throw new Error(`Video download failed with HTTP ${downloadRes.status}`)
      }

      const rawPath = path.join(outputDir, `router-raw-${operationId}.mp4`)
      await fs.promises.writeFile(rawPath, Buffer.from(await downloadRes.arrayBuffer()))

      const finalPath = path.join(outputDir, `veo-${operationId}.mp4`)
      await stretchToTenSeconds(rawPath, finalPath, wanted)
      await fs.promises.unlink(rawPath).catch(() => {})

      clearWatchdog(operationId)
      completeTask(task, `/generated/veo-${operationId}.mp4`, 'veo')
    } catch (err: any) {
      task.fallbackReason = `9Router pipeline error: ${err?.message || err}`
      console.warn(`[9Router] ${task.fallbackReason} — falling back to visual synthesis`)
      return this.runAIVisualSceneGeneration(operationId, req, outputDir)
    }
  },

  /**
   * Pixazo (https://pixazo.ai) video generation via gateway — consumes wallet balance.
   */
  async runPixazoGeneration(
    operationId: string,
    req: VeoGenerationRequest,
    outputDir: string,
    apiKey: string
  ) {
    const task = activeOperations.get(operationId)
    if (!task) return

    task.status = 'processing'
    task.progress = 10

    const wanted = req.aspectRatio || '9:16'

    try {
      const response = await fetch('https://gateway.pixazo.ai/kling-ai-video/v1/generateVideoTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Ocp-Apim-Subscription-Key': apiKey,
        },
        body: JSON.stringify({
          prompt: req.prompt,
          negative_prompt: 'blur, distort, low quality, watermark',
        }),
        signal: AbortSignal.timeout(60000),
      })

      const data = (await response.json().catch(() => null)) as any

      if (!response.ok || data?.error || data?.request_id == null) {
        throw new Error(
          data?.error
            ? `${data.error}${data?.message ? `: ${data.message}` : ''}`
            : `HTTP ${response.status}: ${JSON.stringify(data).slice(0, 300)}`
        )
      }

      const rawRequestId = String(data.request_id)
      const requestId = rawRequestId.includes('_') ? rawRequestId : `klingai-video_${rawRequestId}`
      const statusUrl = `https://gateway.pixazo.ai/v2/requests/status/${requestId}`

      let videoUrl: string | null = null
      for (let attempt = 0; attempt < 60; attempt++) {
        await sleep(5000)

        const current = activeOperations.get(operationId)
        if (!current || current.status === 'failed') return
        task.progress = Math.min(90, 20 + attempt * 2)

        let poll: any
        try {
          const pollRes = await fetch(statusUrl, {
            headers: { 'Ocp-Apim-Subscription-Key': apiKey },
            signal: AbortSignal.timeout(20000),
          })
          if (!pollRes.ok) continue
          poll = await pollRes.json()
        } catch {
          continue
        }

        const status = String(poll?.status || '').toUpperCase()
        if (status === 'FAILED' || poll?.error) {
          throw new Error(`Pixazo render error: ${poll?.error || 'unknown'}`)
        }

        const url = poll?.output?.media_url?.[0] || null
        if (url && status === 'COMPLETED') {
          videoUrl = url
          break
        }
      }

      if (!videoUrl) throw new Error('Pixazo polling timed out before completion')

      task.progress = 92

      const downloadRes = await fetch(videoUrl, { signal: AbortSignal.timeout(120000) })
      if (!downloadRes.ok) {
        throw new Error(`Video download failed with HTTP ${downloadRes.status}`)
      }

      const rawPath = path.join(outputDir, `pixazo-raw-${operationId}.mp4`)
      await fs.promises.writeFile(rawPath, Buffer.from(await downloadRes.arrayBuffer()))

      const finalPath = path.join(outputDir, `veo-${operationId}.mp4`)
      await stretchToTenSeconds(rawPath, finalPath, wanted)
      await fs.promises.unlink(rawPath).catch(() => {})

      clearWatchdog(operationId)
      completeTask(task, `/generated/veo-${operationId}.mp4`, 'veo')
    } catch (err: any) {
      task.fallbackReason = `Pixazo pipeline error: ${err?.message || err}`
      console.warn(`[Pixazo] ${task.fallbackReason} — falling back to visual synthesis`)
      return this.runAIVisualSceneGeneration(operationId, req, outputDir)
    }
  },

  /**
   * Magic Hour (https://magichour.ai) text-to-video — consumes account credits.
   */
  async runMagicHourGeneration(
    operationId: string,
    req: VeoGenerationRequest,
    outputDir: string,
    apiKey: string
  ) {
    const task = activeOperations.get(operationId)
    if (!task) return

    task.status = 'processing'
    task.progress = 10

    const wanted = req.aspectRatio || '9:16'
    const apiAspect = wanted === '1:1' ? '16:9' : wanted

    try {
      const response = await fetch('https://api.magichour.ai/v1/text-to-video', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: `VideoAffiliate ${operationId}`,
          end_seconds: 10,
          aspect_ratio: apiAspect,
          resolution: '480p',
          style: { prompt: req.prompt },
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`)
      }

      const data = (await response.json()) as any
      const projectId = data?.id
      if (!projectId) throw new Error('Magic Hour response did not contain a project id')

      let videoUrl: string | null = null
      for (let attempt = 0; attempt < 60; attempt++) {
        await sleep(5000)

        const current = activeOperations.get(operationId)
        if (!current || current.status === 'failed') return
        task.progress = Math.min(90, 20 + attempt * 2)

        let poll: any
        try {
          const pollRes = await fetch(`https://api.magichour.ai/v1/video-projects/${projectId}`, {
            headers: { accept: 'application/json', Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(20000),
          })
          if (!pollRes.ok) continue
          poll = await pollRes.json()
        } catch {
          continue
        }

        const status = String(poll?.status || '').toLowerCase()
        if (status === 'error') {
          throw new Error(`Magic Hour render error: ${poll?.error?.message || poll?.error?.code || 'unknown'}`)
        }
        if (status === 'canceled') {
          throw new Error('Magic Hour render was canceled')
        }

        const url = poll?.downloads?.[0]?.url || null
        if (url && status === 'complete') {
          videoUrl = url
          break
        }
      }

      if (!videoUrl) throw new Error('Magic Hour polling timed out before completion')

      task.progress = 92

      const downloadRes = await fetch(videoUrl, { signal: AbortSignal.timeout(120000) })
      if (!downloadRes.ok) {
        throw new Error(`Video download failed with HTTP ${downloadRes.status}`)
      }

      const rawPath = path.join(outputDir, `magichour-raw-${operationId}.mp4`)
      await fs.promises.writeFile(rawPath, Buffer.from(await downloadRes.arrayBuffer()))

      const finalPath = path.join(outputDir, `veo-${operationId}.mp4`)
      await stretchToTenSeconds(rawPath, finalPath, wanted)
      await fs.promises.unlink(rawPath).catch(() => {})

      clearWatchdog(operationId)
      completeTask(task, `/generated/veo-${operationId}.mp4`, 'veo')
    } catch (err: any) {
      task.fallbackReason = `Magic Hour pipeline error: ${err?.message || err}`
      console.warn(`[MagicHour] ${task.fallbackReason} — falling back to visual synthesis`)
      return this.runAIVisualSceneGeneration(operationId, req, outputDir)
    }
  },

  /**
   * Google Gemini / Veo video generation (predictLongRunning + polling).
   * Veo 2 generates 5-8s clips, so the result is normalized to exactly 10s.
   */
  async runRealVeoGeneration(
    operationId: string,
    req: VeoGenerationRequest,
    outputDir: string,
    apiKey: string
  ) {
    const task = activeOperations.get(operationId)
    if (!task) return

    task.status = 'processing'
    task.progress = 10

    // Veo on the Gemini API only accepts 16:9 or 9:16 — 1:1 is cropped later.
    const wanted = req.aspectRatio || '9:16'
    const apiAspect = wanted === '1:1' ? '16:9' : wanted

    let opName: string | null = null
    let lastError = ''

    try {
      const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-video:predictLongRunning'
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [{ prompt: req.prompt }],
          parameters: {
            durationSeconds: 8, // Veo 2 max per clip; normalized to 10s afterwards
            aspectRatio: apiAspect,
            personGeneration: 'allow_all',
          },
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (response.ok) {
        const resData = (await response.json()) as any
        opName = resData?.name || null
        if (!opName) lastError = 'Response did not contain an operation name'
      } else {
        lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`
      }
    } catch (err: any) {
      lastError = err?.message || String(err)
    }

    if (!opName) {
      task.fallbackReason = `Veo request failed: ${lastError}`
      console.warn(`[Veo] ${task.fallbackReason} — falling back to visual synthesis`)
      return this.runAIVisualSceneGeneration(operationId, req, outputDir)
    }

    // Poll the long-running operation
    try {
      for (let attempt = 0; attempt < 60; attempt++) {
        await sleep(5000)

        const current = activeOperations.get(operationId)
        if (!current || current.status === 'failed') return // watchdog fired / cancelled
        task.progress = Math.min(90, 20 + attempt * 2)

        let op: any
        try {
          const pollRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${opName}`, {
            headers: { 'x-goog-api-key': apiKey },
            signal: AbortSignal.timeout(20000),
          })
          if (!pollRes.ok) continue
          op = await pollRes.json()
        } catch {
          continue // transient network error — keep polling
        }

        if (op?.error) {
          task.fallbackReason = `Veo operation error: ${op.error.message || 'unknown'}`
          console.warn(`[Veo] ${task.fallbackReason} — falling back to visual synthesis`)
          return this.runAIVisualSceneGeneration(operationId, req, outputDir)
        }

        if (!op?.done) continue

        // The Veo response shape differs between model versions — check all known paths
        const uri =
          op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
          op.response?.generatedVideos?.[0]?.video?.uri ||
          op.response?.videos?.[0]?.uri ||
          null

        if (!uri) {
          task.fallbackReason = 'Veo finished without returning a video (possibly blocked by safety filters)'
          console.warn(`[Veo] ${task.fallbackReason} — falling back to visual synthesis`)
          return this.runAIVisualSceneGeneration(operationId, req, outputDir)
        }

        task.progress = 92

        const downloadRes = await fetch(uri, {
          headers: { 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(120000),
        })
        if (!downloadRes.ok) {
          throw new Error(`Video download failed with HTTP ${downloadRes.status}`)
        }

        const rawPath = path.join(outputDir, `veo-raw-${operationId}.mp4`)
        await fs.promises.writeFile(rawPath, Buffer.from(await downloadRes.arrayBuffer()))

        const finalPath = path.join(outputDir, `veo-${operationId}.mp4`)
        await stretchToTenSeconds(rawPath, finalPath, wanted)
        await fs.promises.unlink(rawPath).catch(() => {})

        clearWatchdog(operationId)
        completeTask(task, `/generated/veo-${operationId}.mp4`, 'veo')
        return
      }

      // Polling window exhausted
      task.fallbackReason = 'Veo polling timed out before completion'
      console.warn(`[Veo] ${task.fallbackReason} — falling back to visual synthesis`)
      return this.runAIVisualSceneGeneration(operationId, req, outputDir)
    } catch (err: any) {
      task.fallbackReason = `Veo pipeline error: ${err?.message || err}`
      console.warn(`[Veo] ${task.fallbackReason} — falling back to visual synthesis`)
      return this.runAIVisualSceneGeneration(operationId, req, outputDir)
    }
  },

  /**
   * Offline visual-synthesis engine: fetch an AI-rendered still frame for the
   * prompt, then animate it into a 10-second cinematic motion clip with FFmpeg.
   */
  async runAIVisualSceneGeneration(
    operationId: string,
    req: VeoGenerationRequest,
    outputDir: string
  ) {
    const task = activeOperations.get(operationId)
    if (!task) return

    task.status = 'processing'
    task.progress = 20

    const filename = `veo-gen-${operationId}.mp4`
    const finalPath = path.join(outputDir, filename)

    // Determine dimensions
    let width = 720
    let height = 1280
    if (req.aspectRatio === '16:9') {
      width = 1280
      height = 720
    } else if (req.aspectRatio === '1:1') {
      width = 720
      height = 720
    }

    const cleanPrompt = (req.prompt || 'Cinematic video scene 8k resolution photorealistic')
      .replace(/['"\\:]/g, ' ')
      .trim()

    const framePaths: string[] = []

    try {
      task.progress = 30
      // 1. Fetch three AI-rendered frames matching the prompt, with robust fallback
      const baseSeed = Math.floor(Math.random() * 1000000)
      const promptQuery = encodeURIComponent(cleanPrompt + ' 8k cinematic photorealistic master quality product showcase')

      const variants = [
        `wide establishing shot, ${cleanPrompt}`,
        `close up detail shot, ${cleanPrompt}`,
        `dramatic angle, cinematic lighting, ${cleanPrompt}`,
      ]

      for (let i = 0; i < 3; i++) {
        const seed = baseSeed + i * 7
        const vq = encodeURIComponent(variants[i] + ' 8k cinematic photorealistic master quality')
        const url = `https://image.pollinations.ai/prompt/${vq}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`
        const framePath = path.join(outputDir, `temp-${operationId}-${i}.jpg`)

        const res = await fetch(url, { signal: AbortSignal.timeout(25000) }).catch(() => null)
        const contentType = res?.headers?.get('content-type') || ''
        if (res && res.ok && contentType.startsWith('image/')) {
          const buffer = Buffer.from(await res.arrayBuffer())
          await fs.promises.writeFile(framePath, buffer)
          framePaths.push(framePath)
          task.progress = 30 + (i + 1) * 10
        } else {
          throw new Error(`Frame ${i + 1} synthesis unavailable`)
        }
      }
      task.progress = 65

      // 2. Animate each frame with a different camera move, then crossfade the scenes together
      const motions = [
        // Scene 1: slow zoom in
        `zoompan=z='min(zoom+0.0010,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=${width}x${height}:fps=30`,
        // Scene 2: pan left to right
        `zoompan=z='1.18':x='(iw-iw/zoom)*(on/125)':y='ih/2-(ih/zoom/2)':d=125:s=${width}x${height}:fps=30`,
        // Scene 3: zoom out
        `zoompan=z='if(lte(on,1),1.25,max(zoom-0.0010,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=${width}x${height}:fps=30`,
      ]

      const scenePaths: string[] = []
      for (let i = 0; i < framePaths.length; i++) {
        const scenePath = path.join(outputDir, `scene-${operationId}-${i}.mp4`)
        const args = [
          '-y',
          '-loop', '1',
          '-i', framePaths[i],
          '-f', 'lavfi',
          '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
          '-vf',
          `scale=${width * 2}:${height * 2},minterpolate=fps=60:mi_mode=blend,${motions[i]}`,
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-t', '3.8',
          '-r', '30',
          '-c:a', 'aac',
          '-shortest',
          scenePath,
        ]

        await new Promise<void>((resolve, reject) => {
          const proc = spawn(ffmpegPath(), args)
          proc.on('error', reject)
          proc.on('close', async (code) => {
            if (code === 0) resolve()
            else reject(new Error(`FFmpeg scene ${i} exited with code ${code}`))
          })
        })
        scenePaths.push(scenePath)
      }
      task.progress = 85

      // 3. Concatenate scenes with crossfades into the final 10s clip
      const n = scenePaths.length
      const fade = 0.4
      const inputs: string[] = []
      scenePaths.forEach((p) => inputs.push('-i', p))
      let filter = ''
      let prev = '[0:v]'
      for (let i = 1; i < n; i++) {
        const out = i === n - 1 ? '[vout]' : `[x${i}]`
        filter += `${prev}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${i * 3.4}${out};`
        prev = out
      }
      filter = filter.replace(/;$/, '')

      const concatArgs = [
        '-y',
        ...inputs,
        '-f', 'lavfi',
        '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-filter_complex', filter,
        '-map', '[vout]',
        '-map', `${n}:a`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-t', '10',
        '-c:a', 'aac',
        '-shortest',
        finalPath,
      ]

      await new Promise<void>((resolve, reject) => {
        const proc = spawn(ffmpegPath(), concatArgs)
        proc.on('error', reject)
        proc.on('close', async (code) => {
          for (const p of [...framePaths, ...scenePaths]) {
            await fs.promises.unlink(p).catch(() => {})
          }
          if (code === 0) resolve()
          else reject(new Error(`FFmpeg concat exited with code ${code}`))
        })
      })

      clearWatchdog(operationId)
      completeTask(task, `/generated/${filename}`, 'visual-synthesis')
      return
    } catch (err: any) {
      console.warn(`[VisualSynthesis] ${err?.message || err} — using gradient fallback`)
      for (const p of framePaths) {
        await fs.promises.unlink(p).catch(() => {})
      }
    }

    // Final fallback: animated gradient clip if everything else fails
    task.progress = 70
    const ffmpegArgs = [
      '-y',
      '-f', 'lavfi',
      '-i',
      `gradients=size=${width}x${height}:rate=30:duration=10:speed=0.01:c0=0x1a1a2e:c1=0x16213e:c2=0x0f3460:c3=0xe94560:type=linear`,
      '-f', 'lavfi',
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
      '-vf',
      'boxblur=10:5,noise=alls=12:allf=t+u,eq=contrast=1.15:saturation=1.25:brightness=0.02',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-t', '10',
      '-c:a', 'aac',
      '-shortest',
      finalPath,
    ]

    await new Promise<void>((resolve) => {
      const proc = spawn(ffmpegPath(), ffmpegArgs)
      proc.on('error', (err) => {
        failTask(task, `FFmpeg could not start: ${err.message}`)
        resolve()
      })
      proc.on('close', (code) => {
        if (code === 0) {
          clearWatchdog(operationId)
          completeTask(task, `/generated/${filename}`, 'visual-synthesis')
        } else {
          failTask(task, `FFmpeg exited with code ${code}`)
        }
        resolve()
      })
    })
  },
}
