import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

export interface TextOverlayExport {
  text: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  fontSize: number
  color: string
  backgroundColor?: string
  startTime: number
  endTime: number
  rotation?: number
}

export interface FilterExport {
  temperature?: number  // -100 to 100
  hue?: number          // -180 to 180 (degrees)
  saturation?: number   // -100 to 100
  brightness?: number   // -100 to 100
  contrast?: number     // -100 to 100
  highlight?: number    // -100 to 100
  shadow?: number       // -100 to 100
  illumination?: number // -100 to 100
  sharpen?: number      // 0 to 100
  particles?: number    // 0 to 100
  fade?: number         // 0 to 100
  vignette?: number     // 0 to 100
}

export interface VideoCropExport {
  mode?: 'fit' | 'fill' | 'custom'
  scale?: number
  x?: number
  y?: number
  rotation?: number
  flipH?: boolean
  flipV?: boolean
}

export interface ExportCompositionRequest {
  aiVideoUrl?: string
  userVideoUrl?: string
  userVideoTrimStart?: number
  userVideoTrimEnd?: number
  aiVideoCrop?: VideoCropExport
  userVideoCrop?: VideoCropExport
  textOverlayPaths?: { path: string; startTime: number; endTime: number }[]
  filters?: FilterExport
  texts?: TextOverlayExport[]
  transition?: {
    type: 'none' | 'fade' | 'crossfade' | 'zoom' | 'slide'
    duration: number
  }
  effects?: {
    speed: number
    filmGrain: boolean
    glitch: boolean
    glow: boolean
  }
  audio?: {
    aiVolume: number
    userVolume: number
    musicVolume: number
    backgroundTrackUrl?: string
  }
  aspectRatio?: '9:16' | '16:9' | '1:1'
  resolution?: '720p' | '1080p'
}

export interface ExportJobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  percent?: number
  step: string
  message?: string
  videoUrl?: string
  downloadUrl?: string
  error?: string
  createdAt: number
}

const activeJobs = new Map<string, ExportJobStatus>()

export const videoExportService = {
  getStatus(jobId: string): ExportJobStatus | undefined {
    return activeJobs.get(jobId)
  },

  buildCropFilter(crop?: VideoCropExport, targetW = 720, targetH = 1280): string {
    const filters: string[] = []

    // 1. Flip
    if (crop?.flipH) filters.push('hflip')
    if (crop?.flipV) filters.push('vflip')

    // 2. Rotation
    if (crop?.rotation === 90) filters.push('transpose=1')
    else if (crop?.rotation === 180) filters.push('transpose=2,transpose=2')
    else if (crop?.rotation === 270) filters.push('transpose=2')

    const mode = crop?.mode || 'fit'
    const scale = crop?.scale || 1
    const x = crop?.x || 0
    const y = crop?.y || 0

    if (mode === 'fill') {
      filters.push(`scale=${targetW}:${targetH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${targetW}:${targetH}:(iw-ow)/2:(ih-oh)/2`)
    } else if (scale > 1.05 || Math.abs(x) > 0 || Math.abs(y) > 0) {
      // Zoom & pan crop
      filters.push(`scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${targetW}:${targetH}:(ow-iw)/2:(ih-oh)/2`)
      const scaledW = Math.round(targetW * scale)
      const scaledH = Math.round(targetH * scale)
      const offsetX = Math.round((x / 100) * targetW)
      const offsetY = Math.round((y / 100) * targetH)
      filters.push(`scale=${scaledW}:${scaledH}:flags=lanczos,crop=${targetW}:${targetH}:max(0\\,min(${scaledW - targetW}\\,(${scaledW}-${targetW})/2-${offsetX})):max(0\\,min(${scaledH - targetH}\\,(${scaledH}-${targetH})/2-${offsetY}))`)
    } else {
      // Standard fit (letterbox)
      filters.push(`scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${targetW}:${targetH}:(ow-iw)/2:(ih-oh)/2`)
    }

    filters.push('setsar=1,fps=30')
    return filters.join(',')
  },

  buildCapCutGradingFilter(f?: FilterExport): string {
    if (!f) return ''
    const segments: string[] = []

    // 1. CapCut natural moody darkness matching exact parameters
    const illumShift = ((f.illumination || 0) / 100) * 0.25 // -10 -> -0.025
    const bVal = ((f.brightness || 0) / 100) * 0.65 + illumShift // -31 -> -0.2265
    const cVal = Math.max(0.6, 1 + ((f.contrast || 0) / 100) * 0.70) // 20 -> 1.14
    const sVal = Math.max(0.1, 1 + ((f.saturation || 0) / 100) * 0.90) // -50 -> 0.55
    const shadowShift = ((f.shadow || 0) / 100) * 0.40 // -10 -> -0.040
    const gamma = Math.max(0.18, 1 + shadowShift) // -> 0.96

    segments.push(`eq=brightness=${bVal.toFixed(3)}:contrast=${cVal.toFixed(3)}:saturation=${sVal.toFixed(3)}:gamma=${gamma.toFixed(3)}`)

    // 2. Hue rotation in degrees (-18 deg)
    if (f.hue && f.hue !== 0) {
      segments.push(`hue=h=${f.hue}*PI/180`)
    }

    // 3. Color Temperature (Warm / Cool)
    if (f.temperature && f.temperature !== 0) {
      const shift = ((f.temperature || 0) / 100) * 0.20
      segments.push(`colorbalance=rs=${shift.toFixed(3)}:bs=${(-shift).toFixed(3)}`)
    }

    // 4. Sharpening (Unsharp Mask 8)
    if (f.sharpen && f.sharpen > 0) {
      const lumaAmount = ((f.sharpen || 0) / 100) * 1.5
      segments.push(`unsharp=5:5:${lumaAmount.toFixed(2)}:5:5:0.0`)
    }

    // 5. Vignette (CapCut 50 radial falloff)
    if (f.vignette && f.vignette > 0) {
      const angle = ((f.vignette || 0) / 100) * (Math.PI / 2.8)
      segments.push(`vignette=angle=${angle.toFixed(3)}`)
    }

    return segments.join(',')
  },

  async startExport(
    req: ExportCompositionRequest,
    rootDir: string
  ): Promise<ExportJobStatus> {
    const jobId = 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)

    const job: ExportJobStatus = {
      jobId,
      status: 'pending',
      progress: 5,
      step: 'Preparing timeline assets...',
      createdAt: Date.now(),
    }
    activeJobs.set(jobId, job)

    // Execute in background
    this.processExport(jobId, req, rootDir)

    return job
  },

  async processExport(jobId: string, req: ExportCompositionRequest, rootDir: string) {
    const job = activeJobs.get(jobId)
    if (!job) return

    const ffmpegPath = process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg'
    const outputFilename = `final-${jobId}.mp4`
    const finalOutputPath = path.join(rootDir, 'exports', outputFilename)

    try {
      job.status = 'processing'
      job.step = 'Normalizing video tracks...'
      job.progress = 15

      // Target canvas dimensions (Default to 1080p FHD for crystal clear quality)
      const is1080p = req.resolution !== '720p'
      let targetW = is1080p ? 1080 : 720
      let targetH = is1080p ? 1920 : 1280

      if (req.aspectRatio === '16:9') {
        targetW = is1080p ? 1920 : 1280
        targetH = is1080p ? 1080 : 720
      } else if (req.aspectRatio === '1:1') {
        targetW = is1080p ? 1080 : 720
        targetH = is1080p ? 1080 : 720
      }

      // Resolve local paths for videos
      const resolveLocalPath = (fileUrl?: string): string | null => {
        if (!fileUrl) return null
        if (fileUrl.startsWith('/uploads/')) {
          return path.join(rootDir, fileUrl.replace('/', ''))
        }
        if (fileUrl.startsWith('/generated/')) {
          return path.join(rootDir, fileUrl.replace('/', ''))
        }
        if (fileUrl.startsWith('/exports/')) {
          return path.join(rootDir, fileUrl.replace('/', ''))
        }
        if (fs.existsSync(fileUrl)) {
          return fileUrl
        }
        return null
      }

      const aiPath = resolveLocalPath(req.aiVideoUrl)
      const userPath = resolveLocalPath(req.userVideoUrl)

      // Temporary normalized paths
      const tempAi = path.join(rootDir, 'exports', `temp-ai-${jobId}.mp4`)
      const tempUser = path.join(rootDir, 'exports', `temp-user-${jobId}.mp4`)

      // Build crop and transform filters for both clips
      const aiCropFilter = this.buildCropFilter(req.aiVideoCrop, targetW, targetH)
      const userCropFilter = this.buildCropFilter(req.userVideoCrop, targetW, targetH)

      // CapCut color grading filter: applied ONLY to Clip 1 (0-10s)
      const aiGradingFilter = this.buildCapCutGradingFilter(req.filters)

      // 0.5s Dip-to-Black (Transisi Gelap) between Clip 1 and Clip 2
      const transType = req.transition?.type || 'fade'
      const transDur = req.transition?.duration || 0.5
      const halfDur = transDur / 2 // 0.25s

      let aiTransitionFilter = ''
      let userTransitionFilter = ''

      if (transType === 'fade') {
        const fadeOutStart = Math.max(0, 10 - halfDur) // e.g. 9.75s
        aiTransitionFilter = `fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${halfDur.toFixed(3)}`
        userTransitionFilter = `fade=t=in:st=0:d=${halfDur.toFixed(3)}`
      }

      const aiFiltersList = [aiCropFilter]
      if (aiGradingFilter) aiFiltersList.push(aiGradingFilter)
      if (aiTransitionFilter) aiFiltersList.push(aiTransitionFilter)
      const aiFullVf = aiFiltersList.join(',')

      const userFiltersList = [userCropFilter]
      if (userTransitionFilter) userFiltersList.push(userTransitionFilter)
      const userFullVf = userFiltersList.join(',')

      // Prepare AI segment (0-10s, with CapCut dark filter, text overlays & dip-to-black fadeout)
      const aiInputArgs: string[] = ['-y']
      if (aiPath && fs.existsSync(aiPath)) {
        aiInputArgs.push('-i', aiPath)
      } else {
        aiInputArgs.push('-f', 'lavfi', '-i', `color=c=black:s=${targetW}x${targetH}:d=10:r=30`)
      }

      // Add each valid text overlay PNG as an input stream
      const textOverlays = req.textOverlayPaths || []
      const validTextOverlays: { path: string; startTime: number; endTime: number; streamIdx: number }[] = []

      for (let i = 0; i < textOverlays.length; i++) {
        const item = textOverlays[i]
        if (item.path && fs.existsSync(item.path)) {
          aiInputArgs.push('-i', item.path)
          validTextOverlays.push({
            ...item,
            streamIdx: validTextOverlays.length + 1, // input 0 is video
          })
        }
      }

      if (validTextOverlays.length === 0) {
        aiInputArgs.push(
          '-t',
          '10',
          '-vf',
          aiFullVf,
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '17',
          '-b:v',
          '8M',
          '-maxrate',
          '12M',
          '-bufsize',
          '16M',
          '-pix_fmt',
          'yuv420p',
          '-an',
          tempAi
        )
      } else {
        // Build filter_complex with chained text overlays
        let currentStream = 'v0'
        const filterSegments: string[] = []

        // 1. Initial video crop, grading & transition fadeout
        filterSegments.push(`[0:v]${aiFullVf}[${currentStream}]`)

        // 2. Chain each text overlay
        for (let i = 0; i < validTextOverlays.length; i++) {
          const t = validTextOverlays[i]
          const nextStream = `v${i + 1}`
          const startT = Math.max(0, t.startTime || 0)
          const endT = Math.min(10, t.endTime || 10)
          filterSegments.push(
            `[${currentStream}][${t.streamIdx}:v]overlay=0:0:enable='between(t,${startT.toFixed(2)},${endT.toFixed(2)})'[${nextStream}]`
          )
          currentStream = nextStream
        }

        aiInputArgs.push(
          '-t',
          '10',
          '-filter_complex',
          filterSegments.join(';'),
          '-map',
          `[${currentStream}]`,
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '17',
          '-b:v',
          '8M',
          '-maxrate',
          '12M',
          '-bufsize',
          '16M',
          '-pix_fmt',
          'yuv420p',
          '-an',
          tempAi
        )
      }

      await this.runFfmpeg(ffmpegPath, aiInputArgs)

      job.step = 'Preparing User video segment (clean, no filter, dip-to-black fadein)...'
      job.progress = 40

      // Prepare User segment (6s, 10s-16s, NO filter applied, fade in from black)
      const userTrimStart = req.userVideoTrimStart || 0
      if (userPath && fs.existsSync(userPath)) {
        await this.runFfmpeg(ffmpegPath, [
          '-y',
          '-ss',
          String(userTrimStart),
          '-i',
          userPath,
          '-t',
          '6',
          '-vf',
          userFullVf,
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '17',
          '-b:v',
          '8M',
          '-maxrate',
          '12M',
          '-bufsize',
          '16M',
          '-pix_fmt',
          'yuv420p',
          '-an',
          tempUser,
        ])
      } else {
        await this.runFfmpeg(ffmpegPath, [
          '-y',
          '-f',
          'lavfi',
          '-i',
          `color=c=#1a1d26:s=${targetW}x${targetH}:d=6:r=30`,
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '17',
          '-pix_fmt',
          'yuv420p',
          tempUser,
        ])
      }

      job.step = 'Merging 10s AI (graded) + 6s User (clean) tracks...'
      job.progress = 65

      // Concatenate files using filter_complex concat
      const mergedTemp = path.join(rootDir, 'exports', `temp-merged-${jobId}.mp4`)
      await this.runFfmpeg(ffmpegPath, [
        '-y',
        '-i',
        tempAi,
        '-i',
        tempUser,
        '-filter_complex',
        '[0:v][1:v]concat=n=2:v=1:a=0[v]',
        '-map',
        '[v]',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '17',
        '-pix_fmt',
        'yuv420p',
        mergedTemp,
      ])

      job.step = 'Encoding final master MP4...'
      job.progress = 85

      // Final pass: generate silent/audio track and output 16s master with High Quality Bitrate
      await this.runFfmpeg(ffmpegPath, [
        '-y',
        '-i',
        mergedTemp,
        '-f',
        'lavfi',
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '16',
        '-b:v',
        '10M',
        '-maxrate',
        '15M',
        '-bufsize',
        '20M',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-t',
        '16',
        '-shortest',
        finalOutputPath,
      ])

      // Clean up temp files
      try {
        if (fs.existsSync(tempAi)) fs.unlinkSync(tempAi)
        if (fs.existsSync(tempUser)) fs.unlinkSync(tempUser)
        if (fs.existsSync(mergedTemp)) fs.unlinkSync(mergedTemp)
        if (req.textOverlayPaths) {
          for (const item of req.textOverlayPaths) {
            if (item.path && fs.existsSync(item.path)) {
              fs.unlinkSync(item.path)
            }
          }
        }
      } catch (cleanErr) {
        // ignore cleanup error
      }

      job.status = 'completed'
      job.progress = 100
      job.percent = 100
      job.step = 'Export completed!'
      job.message = 'Export completed!'
      job.videoUrl = `/exports/${outputFilename}`
      job.downloadUrl = `/exports/${outputFilename}`
    } catch (err: any) {
      console.error('[Export Error]:', err)
      job.status = 'failed'
      job.step = 'Export failed'
      job.error = err.message || 'Error occurred while processing video'
    }
  },

  runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args)
      let stderr = ''
      proc.stderr.on('data', (d) => {
        stderr += d.toString()
      })
      proc.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-300)}`))
        }
      })
      proc.on('error', (err) => reject(err))
    })
  },
}
