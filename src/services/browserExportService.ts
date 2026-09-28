import type { ProjectState } from '@/types/project'
import type { VideoCropSettings } from '@/types/video'
import type { TextItem } from '@/types/text'
import type { ProgressCallback } from './ffmpegService'
import { videoService } from './videoService'

const FONT_MAP: Record<string, string> = {
  Classic: "'Cinzel', serif",
  Modern: "'Montserrat', sans-serif",
  Serif: "'Playfair Display', serif",
  Sans: "'Inter', sans-serif",
  Bold: "'Anton', sans-serif",
  Elegant: "'Dancing Script', cursive",
  Handwriting: "'Dancing Script', cursive",
  Retro: "'Righteous', cursive",
  Minimal: "'Space Grotesk', sans-serif",
}

export const browserExportService = {
  /**
   * Render complete 16s composition in the browser using HTML5 Canvas + MediaRecorder
   */
  async exportProject(
    project: ProjectState,
    onProgress: ProgressCallback
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      onProgress({
        phase: 'Preparing',
        percent: 5,
        message: 'Initializing browser video rendering engine...',
      })

      if (document.fonts) {
        await document.fonts.ready
      }

      // 1. Determine dimensions
      let width = 720
      let height = 1280
      if (project.aspectRatio === '16:9') {
        width = 1280
        height = 720
      } else if (project.aspectRatio === '1:1') {
        width = 720
        height = 720
      }

      // 2. Setup offscreen Canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not create Canvas 2D context')

      // 3. Setup video elements
      const aiVideoEl = document.createElement('video')
      aiVideoEl.crossOrigin = 'anonymous'
      aiVideoEl.playsInline = true
      aiVideoEl.muted = false
      aiVideoEl.preload = 'auto'

      const userVideoEl = document.createElement('video')
      userVideoEl.crossOrigin = 'anonymous'
      userVideoEl.playsInline = true
      userVideoEl.muted = false
      userVideoEl.preload = 'auto'

      const hasAi = !!(project.aiVideo?.url || project.aiVideo?.file)
      const hasUser = !!(project.userVideo?.url || project.userVideo?.file)

      if (hasAi) {
        aiVideoEl.src = project.aiVideo!.file
          ? URL.createObjectURL(project.aiVideo!.file)
          : (project.aiVideo!.cloudUrl || project.aiVideo!.url)
      }
      if (hasUser) {
        userVideoEl.src = project.userVideo!.file
          ? URL.createObjectURL(project.userVideo!.file)
          : (project.userVideo!.cloudUrl || project.userVideo!.url)
      }

      // Wait for videos to load metadata
      const loadPromises: Promise<any>[] = []
      if (hasAi) {
        loadPromises.push(
          new Promise((res) => {
            aiVideoEl.onloadeddata = res
            aiVideoEl.onerror = () => {
              console.warn('AI video load warning, proceeding...')
              res(null)
            }
          })
        )
      }
      if (hasUser) {
        loadPromises.push(
          new Promise((res) => {
            userVideoEl.onloadeddata = res
            userVideoEl.onerror = () => {
              console.warn('User video load warning, proceeding...')
              res(null)
            }
          })
        )
      }

      onProgress({
        phase: 'Preparing',
        percent: 15,
        message: 'Buffering media tracks and timeline elements...',
      })

      await Promise.all(loadPromises)

      // 4. Setup AudioContext and stream mixing
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      let audioCtx: AudioContext | null = null
      let audioDest: MediaStreamAudioDestinationNode | null = null

      try {
        audioCtx = new AudioContextClass()
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume()
        }
        audioDest = audioCtx.createMediaStreamDestination()

        // AI audio track
        if (hasAi) {
          try {
            const aiSource = audioCtx.createMediaElementSource(aiVideoEl)
            const aiGain = audioCtx.createGain()
            const vol = project.audio?.isMuted ? 0 : (project.audio?.aiVolume ?? 100) / 100
            aiGain.gain.value = vol
            aiSource.connect(aiGain).connect(audioDest)
          } catch (e) {
            console.warn('AI audio source connect note:', e)
          }
        }

        // User audio track
        if (hasUser) {
          try {
            const userSource = audioCtx.createMediaElementSource(userVideoEl)
            const userGain = audioCtx.createGain()
            const vol = project.audio?.isMuted ? 0 : (project.audio?.userVolume ?? 100) / 100
            userGain.gain.value = vol
            userSource.connect(userGain).connect(audioDest)
          } catch (e) {
            console.warn('User audio source connect note:', e)
          }
        }
      } catch (audioErr) {
        console.warn('Web Audio initialization note:', audioErr)
      }

      // 5. Setup MediaRecorder
      const canvasStream = canvas.captureStream(30)
      let combinedStream = canvasStream

      if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioDest.stream.getAudioTracks(),
        ])
      }

      const mimeCandidates = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
      let selectedMime = 'video/webm'
      for (const m of mimeCandidates) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m
          break
        }
      }

      const chunks: Blob[] = []
      const recorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 8000000, // 8 Mbps
      })

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      // 6. Precompute CapCut filter values
      const f = project.filters || {}
      const bShift = ((f.brightness || 0) / 100) * 0.65
      const illumShift = ((f.illumination || 0) / 100) * 0.25
      const shadowDarkening =
        (f.shadow || 0) < 0 ? ((f.shadow || 0) / 100) * 0.2 : ((f.shadow || 0) / 100) * 0.1
      const highlightDarkening =
        (f.highlight || 0) < 0 ? ((f.highlight || 0) / 100) * 0.15 : ((f.highlight || 0) / 100) * 0.05
      const brightnessVal = Math.max(0.18, 1 + bShift + illumShift + shadowDarkening + highlightDarkening)
      const contrastVal = Math.max(0.6, 1 + ((f.contrast || 0) / 100) * 0.7)
      const saturateVal = Math.max(0.1, 1 + ((f.saturation || 0) / 100) * 0.9)
      const hueRotateVal = f.hue || 0
      const sepiaVal = (f.temperature || 0) > 0 ? ((f.temperature || 0) / 100) * 0.25 : 0

      const capcutFilterString = `brightness(${brightnessVal.toFixed(3)}) contrast(${contrastVal.toFixed(
        3
      )}) saturate(${saturateVal.toFixed(3)}) hue-rotate(${hueRotateVal}deg)${
        sepiaVal > 0 ? ` sepia(${sepiaVal.toFixed(3)})` : ''
      }`

      // Helper function to draw cropped/transformed video onto canvas
      function drawVideoCover(
        video: HTMLVideoElement,
        crop: VideoCropSettings | undefined,
        applyFilter = false
      ) {
        if (!video.videoWidth || !video.videoHeight) return

        ctx!.save()
        if (applyFilter) {
          ctx!.filter = capcutFilterString
        }

        const mode = crop?.mode || 'fit'
        const scale = crop?.scale || 1
        const offsetX = ((crop?.x || 0) / 100) * width
        const offsetY = ((crop?.y || 0) / 100) * height

        ctx!.translate(width / 2 + offsetX, height / 2 + offsetY)

        if (crop?.rotation) {
          ctx!.rotate((crop.rotation * Math.PI) / 180)
        }
        if (crop?.flipH || crop?.flipV) {
          ctx!.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1)
        }

        const vW = video.videoWidth
        const vH = video.videoHeight
        let renderW = width
        let renderH = height

        if (mode === 'fill') {
          const videoAspect = vW / vH
          const canvasAspect = width / height
          if (videoAspect > canvasAspect) {
            renderH = height * scale
            renderW = renderH * videoAspect
          } else {
            renderW = width * scale
            renderH = renderW / videoAspect
          }
        } else {
          // fit (contain)
          const videoAspect = vW / vH
          const canvasAspect = width / height
          if (videoAspect > canvasAspect) {
            renderW = width * scale
            renderH = renderW / videoAspect
          } else {
            renderH = height * scale
            renderW = renderH * videoAspect
          }
        }

        ctx!.drawImage(video, -renderW / 2, -renderH / 2, renderW, renderH)
        ctx!.restore()
      }

      // Helper function to draw CapCut Overlay layers (vignette, fade, temperature)
      function drawCapCutOverlays(weight: number) {
        if (weight <= 0) return

        // 1. Temperature
        if (f.temperature && f.temperature !== 0) {
          const isWarm = f.temperature > 0
          const color = isWarm ? '255, 160, 40' : '50, 140, 255'
          const alpha = (Math.abs(f.temperature) / 100) * 0.2 * weight
          ctx!.save()
          ctx!.fillStyle = `rgba(${color}, ${alpha})`
          ctx!.fillRect(0, 0, width, height)
          ctx!.restore()
        }

        // 2. Vignette
        if (f.vignette && f.vignette > 0) {
          const darkness = Math.min(0.92, (f.vignette / 100) * 1.15) * weight
          const grad = ctx!.createRadialGradient(
            width / 2,
            height / 2,
            width * 0.25,
            width / 2,
            height / 2,
            width * 0.75
          )
          grad.addColorStop(0, 'rgba(0,0,0,0)')
          grad.addColorStop(0.65, `rgba(0,0,0,${(darkness * 0.5).toFixed(3)})`)
          grad.addColorStop(1, `rgba(0,0,0,${darkness.toFixed(3)})`)

          ctx!.save()
          ctx!.fillStyle = grad
          ctx!.fillRect(0, 0, width, height)
          ctx!.restore()
        }

        // 3. Fade / Matte floor
        if (f.fade && f.fade > 0) {
          const alpha = ((f.fade / 100) * 0.15 * weight).toFixed(3)
          ctx!.save()
          ctx!.fillStyle = `rgba(24, 25, 32, ${alpha})`
          ctx!.fillRect(0, 0, width, height)
          ctx!.restore()
        }
      }

      // Helper function to draw text items on canvas
      function drawTextItem(item: TextItem) {
        if (!item.text || !item.text.trim()) return

        ctx!.save()
        const posX = (item.x / 100) * width
        const posY = (item.y / 100) * height
        ctx!.translate(posX, posY)

        if (item.rotation) {
          ctx!.rotate((item.rotation * Math.PI) / 180)
        }

        const resScale = height / 1280
        const effScale = (item.scale || 1) * resScale
        ctx!.scale(effScale, effScale)
        ctx!.globalAlpha = item.opacity !== undefined ? item.opacity : 1

        const fontStyle = item.italic ? 'italic ' : ''
        const fontWeight = item.bold ? 'bold ' : 'normal '
        const fontSize = item.fontSize || 32
        const fontFamily = FONT_MAP[item.fontFamily] || 'sans-serif'
        ctx!.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`
        ctx!.textBaseline = 'middle'
        ctx!.textAlign = (item.textAlign as CanvasTextAlign) || 'center'

        const lines = item.text.split('\n')
        const lineHeight = fontSize * (item.lineHeight || 1.25)
        const totalH = lines.length * lineHeight
        const startY = -(totalH / 2) + lineHeight / 2

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const curY = startY + i * lineHeight

          // Background box
          if (item.backgroundColor && item.backgroundColor !== 'transparent') {
            const metrics = ctx!.measureText(line)
            const padX = fontSize * 0.4
            const padY = fontSize * 0.2
            ctx!.fillStyle = item.backgroundColor
            ctx!.fillRect(
              -metrics.width / 2 - padX,
              curY - fontSize / 2 - padY,
              metrics.width + padX * 2,
              fontSize + padY * 2
            )
          }

          // Shadow
          if (item.shadow?.enabled) {
            ctx!.shadowColor = item.shadow.color || 'rgba(0,0,0,0.8)'
            ctx!.shadowBlur = item.shadow.blur || 8
            ctx!.shadowOffsetX = item.shadow.offsetX || 2
            ctx!.shadowOffsetY = item.shadow.offsetY || 2
          } else {
            ctx!.shadowColor = 'transparent'
            ctx!.shadowBlur = 0
          }

          // Stroke / Outline
          if (item.stroke?.enabled) {
            ctx!.strokeStyle = item.stroke.color || '#000000'
            ctx!.lineWidth = (item.stroke.width || 2) * 2
            ctx!.lineJoin = 'round'
            ctx!.strokeText(line, 0, curY)
          }

          // Text fill
          ctx!.fillStyle = item.color || '#ffffff'
          ctx!.fillText(line, 0, curY)
        }

        ctx!.restore()
      }

      // 7. Start recording and playback loop
      recorder.start(100) // collect chunks every 100ms

      const totalDuration = 16.0
      const startTime = performance.now()
      let userPlaybackStarted = false

      if (hasAi) {
        aiVideoEl.currentTime = 0
        aiVideoEl.play().catch(() => {})
      }

      return await new Promise((resolve) => {
        function renderLoop() {
          const now = performance.now()
          const elapsed = (now - startTime) / 1000

          if (elapsed >= totalDuration) {
            // Finished
            recorder.onstop = async () => {
              onProgress({
                phase: 'Finalizing',
                percent: 100,
                message: 'Finalizing high-definition video...',
              })

              const finalBlob = new Blob(chunks, { type: selectedMime })
              const localUrl = URL.createObjectURL(finalBlob)

              // Try auto-upload to Vercel Blob in background
              let cloudUrl: string | undefined
              try {
                const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm'
                const uploadFile = new File([finalBlob], `final-16s-${Date.now()}.${ext}`, {
                  type: selectedMime,
                })
                const blobRes = await videoService.uploadToBlob(uploadFile)
                if (blobRes?.url) {
                  cloudUrl = blobRes.url
                }
              } catch (e) {
                console.warn('Vercel Blob sync note:', e)
              }

              // Cleanup
              if (hasAi) aiVideoEl.pause()
              if (hasUser) userVideoEl.pause()
              if (audioCtx) audioCtx.close().catch(() => {})

              resolve({
                success: true,
                downloadUrl: cloudUrl || localUrl,
              })
            }

            recorder.stop()
            return
          }

          // Progress update
          const percent = Math.min(98, Math.max(15, Math.round((elapsed / totalDuration) * 100)))
          onProgress({
            phase: elapsed < 10 ? 'Rendering' : 'Applying effects',
            percent,
            message: `Synthesizing composition: ${elapsed.toFixed(1)}s / 16.0s (${percent}%)`,
          })

          // Clear canvas with black background
          ctx!.fillStyle = '#000000'
          ctx!.fillRect(0, 0, width, height)

          const transDur = project.transition?.duration || 0.5
          const halfDur = transDur / 2

          if (elapsed < 10) {
            // Segment 1: AI Video (0s - 10s)
            if (hasAi && aiVideoEl.readyState >= 2) {
              drawVideoCover(aiVideoEl, project.aiVideo?.crop, true)
            }

            // CapCut grading overlays
            let aiWeight = 1.0
            if (elapsed >= 10 - halfDur) {
              aiWeight = Math.max(0, 1 - (elapsed - (10 - halfDur)) / halfDur)
            }
            drawCapCutOverlays(aiWeight)

            // Dip-to-black fade out
            if (elapsed >= 10 - halfDur) {
              const fadeAlpha = Math.min(1, (elapsed - (10 - halfDur)) / halfDur)
              ctx!.fillStyle = `rgba(0, 0, 0, ${fadeAlpha.toFixed(3)})`
              ctx!.fillRect(0, 0, width, height)
            }
          } else {
            // Segment 2: User Video (10s - 16s)
            if (!userPlaybackStarted) {
              userPlaybackStarted = true
              if (hasAi) aiVideoEl.pause()
              if (hasUser) {
                const userTrimStart = project.userVideo?.trimStart || 0
                userVideoEl.currentTime = userTrimStart
                userVideoEl.play().catch(() => {})
              }
            }

            if (hasUser && userVideoEl.readyState >= 2) {
              drawVideoCover(userVideoEl, project.userVideo?.crop, false) // Clean, no filter
            }

            // Dip-to-black fade in
            if (elapsed <= 10 + halfDur) {
              const fadeInAlpha = Math.max(0, 1 - (elapsed - 10) / halfDur)
              ctx!.fillStyle = `rgba(0, 0, 0, ${fadeInAlpha.toFixed(3)})`
              ctx!.fillRect(0, 0, width, height)
            }
          }

          // Draw active Text Overlays
          if (project.texts && project.texts.length > 0) {
            for (const item of project.texts) {
              if (elapsed >= item.startTime && elapsed <= Math.min(16, item.endTime)) {
                drawTextItem(item)
              }
            }
          }

          requestAnimationFrame(renderLoop)
        }

        requestAnimationFrame(renderLoop)
      })
    } catch (err: any) {
      console.error('Browser export error:', err)
      return {
        success: false,
        error: err.message || 'Failed to render video in browser',
      }
    }
  },
}
