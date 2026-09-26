import { defineStore } from 'pinia'
import { ref } from 'vue'
import { geminiService } from '@/services/geminiService'
import type { VideoClip, VideoGenerationStatus } from '@/types/video'

const RESUME_KEY = 'va-active-generation'

export const useAIGenerationStore = defineStore('aiGeneration', () => {
  const isGenerating = ref(false)
  const status = ref<VideoGenerationStatus>('idle')
  const progress = ref(0)
  const statusMessage = ref('')
  const operationId = ref<string | null>(null)
  const startedAt = ref<number | null>(null)

  let pollTimer: ReturnType<typeof setTimeout> | null = null

  function setUI(
    partial: Partial<{
      isGenerating: boolean
      status: VideoGenerationStatus
      progress: number
      statusMessage: string
    }>
  ) {
    if (partial.isGenerating !== undefined) isGenerating.value = partial.isGenerating
    if (partial.status) status.value = partial.status
    if (partial.progress !== undefined) progress.value = partial.progress
    if (partial.statusMessage !== undefined) statusMessage.value = partial.statusMessage
  }

  function clearResume() {
    try { sessionStorage.removeItem(RESUME_KEY) } catch {}
  }

  function saveResume() {
    try {
      sessionStorage.setItem(
        RESUME_KEY,
        JSON.stringify({ operationId: operationId.value, startedAt: startedAt.value })
      )
    } catch {}
  }

  /**
   * Start a new generation request and begin polling.
   */
  async function start(
    prompt: string,
    options: { aspectRatio?: string; quality?: 'Standard' | 'High' },
    onCompleted: (clipUrl: string) => void,
    onFailed: (message: string) => void,
    notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void
  ) {
    cancelPolling()
    isGenerating.value = true
    status.value = 'Preparing'
    progress.value = 0
    statusMessage.value = 'Initializing AI video pipeline...'
    startedAt.value = Date.now()

    try {
      const response = await geminiService.generateVideo(prompt, {
        duration: 10,
        aspectRatio: (options.aspectRatio as any) || '9:16',
        quality: options.quality || 'Standard',
      })

      if (response.videoUrl) {
        finishWithSuccess(response.videoUrl, onCompleted)
        return
      }

      if (response.operationId) {
        operationId.value = response.operationId
        saveResume()
        poll(response.operationId, onCompleted, onFailed, notify, 0)
      } else {
        throw new Error('No operation ID or video URL returned')
      }
    } catch (err: any) {
      fail(err?.message || 'Video generation failed. Please try again.', onFailed, notify)
    }
  }

  /**
   * Sequential polling loop with network-error tolerance.
   * Runs on the store (not a component) so it survives tab switches.
   */
  function poll(
    id: string,
    onCompleted: (clipUrl: string) => void,
    onFailed: (message: string) => void,
    notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void,
    attempt: number
  ) {
    const maxAttempts = 96 // ~4 minutes at 2.5s interval

    if (attempt >= maxAttempts) {
      fail('AI generation request timed out.', onFailed, notify)
      return
    }

    pollTimer = setTimeout(async () => {
      try {
        const statusRes = await geminiService.getGenerationStatus(id)
        const rawStatus = (statusRes.status || '').toLowerCase()

        progress.value = typeof statusRes.progress === 'number' ? statusRes.progress : progress.value

        if (rawStatus === 'queued' || rawStatus === 'preparing') {
          setUI({ status: 'Preparing', statusMessage: 'Preparing scene assets & prompt embeddings...' })
        } else if (rawStatus === 'processing' || rawStatus === 'generating') {
          setUI({ status: 'Generating', statusMessage: 'Rendering 10-second clip with the AI video engine...' })
        } else if (rawStatus === 'completed' && statusRes.videoUrl) {
          clearResume()
          finishWithSuccess(statusRes.videoUrl, onCompleted)
          return
        } else if (rawStatus === 'failed') {
          clearResume()
          fail(statusRes.error || 'Video generation failed. Please try again.', onFailed, notify)
          return
        }

        // Keep polling
        poll(id, onCompleted, onFailed, notify, attempt + 1)
      } catch {
        // Transient network error: do not abort, retry (up to the attempt cap)
        poll(id, onCompleted, onFailed, notify, attempt + 1)
      }
    }, 2500)
  }

  function finishWithSuccess(videoUrl: string, onCompleted: (clipUrl: string) => void) {
    clearResume()
    isGenerating.value = false
    status.value = 'Completed'
    progress.value = 100
    statusMessage.value = '10s AI Video generated successfully!'
    operationId.value = null
    onCompleted(videoUrl)
  }

  function fail(
    message: string,
    onFailed?: (message: string) => void,
    notify?: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void
  ) {
    isGenerating.value = false
    status.value = 'Failed'
    statusMessage.value = message
    operationId.value = null
    clearResume()
    onFailed?.(message)
    notify?.('error', message)
  }

  function cancelPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  function cancel() {
    cancelPolling()
    clearResume()
    isGenerating.value = false
    status.value = 'idle'
    statusMessage.value = 'Generation cancelled.'
    operationId.value = null
  }

  /**
   * If the page was refreshed mid-generation, resume polling for that task.
   */
  function tryResume(
    onCompleted: (clipUrl: string) => void,
    onFailed: (message: string) => void,
    notify: (type: 'success' | 'error' | 'warning' | 'info', msg: string) => void
  ) {
    let saved: { operationId?: string; startedAt?: number } | null = null
    try {
      saved = JSON.parse(sessionStorage.getItem(RESUME_KEY) || 'null')
    } catch {}

    if (!saved?.operationId) return false

    const elapsed = Date.now() - (saved.startedAt || Date.now())
    if (elapsed > 8 * 60 * 1000) {
      // Stale — server watchdog caps tasks at 6 minutes anyway
      clearResume()
      return false
    }

    isGenerating.value = true
    status.value = 'Generating'
    statusMessage.value = 'Resuming AI video generation...'
    startedAt.value = saved.startedAt || Date.now()
    operationId.value = saved.operationId
    poll(saved.operationId, onCompleted, onFailed, notify, Math.floor(elapsed / 2500))
    return true
  }

  return {
    isGenerating,
    status,
    progress,
    statusMessage,
    operationId,
    startedAt,
    start,
    cancel,
    tryResume,
  }
})

export interface AIStoreClipSetter {
  (clip: VideoClip): void
}
