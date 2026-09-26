import type { ProjectState } from '@/types/project'
import { videoService } from './videoService'
import { useEditorStore } from '@/stores/editorStore'

export interface ExportProgressEvent {
  phase: 'Preparing' | 'Rendering' | 'Applying effects' | 'Encoding' | 'Finalizing' | 'Completed' | 'Failed'
  percent: number // 0 to 100
  message: string
}

export type ProgressCallback = (event: ExportProgressEvent) => void

export const ffmpegService = {
  /**
   * Request backend export with FFmpeg
   */
  async exportVideo(
    project: ProjectState,
    onProgress: ProgressCallback
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      onProgress({
        phase: 'Preparing',
        percent: 10,
        message: 'Validating project timeline and assets...',
      })

      const formData = new FormData()
      formData.append('projectJson', JSON.stringify(project))

      if (project.userVideo?.file) {
        formData.append('userVideoFile', project.userVideo.file)
      }
      if (project.aiVideo?.file) {
        formData.append('aiVideoFile', project.aiVideo.file)
      }

      // Render Clip 1 text overlays (strictly 0 - 10s) to 1080p FHD transparent PNGs
      let canvasW = 1080
      let canvasH = 1920
      if (project.aspectRatio === '16:9') {
        canvasW = 1920
        canvasH = 1080
      } else if (project.aspectRatio === '1:1') {
        canvasW = 1080
        canvasH = 1080
      }

      if (project.texts && project.texts.length > 0) {
        onProgress({
          phase: 'Preparing',
          percent: 18,
          message: 'Rendering typography and text overlays...',
        })

        for (let i = 0; i < project.texts.length; i++) {
          const t = project.texts[i]
          if (t.startTime < 10 && t.text && t.text.trim()) {
            const blob = await videoService.renderTextItemToBlob(t, canvasW, canvasH)
            if (blob) {
              formData.append(`textOverlay_${i}`, blob, `text_${i}.png`)
            }
          }
        }
      }

      onProgress({
        phase: 'Rendering',
        percent: 25,
        message: 'Synthesizing composition tracks and transitions...',
      })

      const response = await fetch('/api/export-video', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || 'Server FFmpeg export failed')
      }

      const data = await response.json()
      const jobId = data.jobId

      if (!jobId) {
        const directUrl = data.downloadUrl || data.videoUrl
        if (directUrl) {
          onProgress({ phase: 'Completed', percent: 100, message: 'Ready!' })
          return { success: true, downloadUrl: directUrl }
        }
        throw new Error('No job ID returned from exporter')
      }

      // Poll progress from server
      return await new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/export-video/status/${jobId}`)
            if (!statusRes.ok) throw new Error('Failed to query export status')
            const statusData = await statusRes.json()

            onProgress({
              phase: statusData.phase || (statusData.status === 'completed' ? 'Completed' : 'Encoding'),
              percent: statusData.progress || statusData.percent || 50,
              message: statusData.step || statusData.message || 'Processing video...',
            })

            if (statusData.status === 'completed' || statusData.phase === 'Completed') {
              clearInterval(interval)
              const finalUrl = statusData.videoUrl || statusData.downloadUrl
              resolve({
                success: true,
                downloadUrl: finalUrl,
              })
            } else if (statusData.status === 'failed' || statusData.phase === 'Failed') {
              clearInterval(interval)
              reject(new Error(statusData.error || 'Export rendering failed'))
            }
          } catch (e) {
            clearInterval(interval)
            reject(e)
          }
        }, 1200)
      })
    } catch (err: any) {
      onProgress({
        phase: 'Failed',
        percent: 0,
        message: err.message || 'Export failed',
      })
      return {
        success: false,
        error: err.message || 'Export error',
      }
    }
  },
}
