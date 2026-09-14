import type { AIGenerationRequest, AIGenerationResponse } from '@/types/video'

export interface GeminiVideoOptions {
  duration?: number // 10s default
  aspectRatio?: '9:16' | '16:9' | '1:1'
  quality?: 'Standard' | 'High'
}

/**
 * Service to communicate with Backend AI Video Generation API
 * Keeps API keys safely on the server
 */
export const geminiService = {
  /**
   * Request generation of 10s video from prompt
   */
  async generateVideo(
    prompt: string,
    options: GeminiVideoOptions = {}
  ): Promise<AIGenerationResponse> {
    const payload: AIGenerationRequest = {
      prompt: prompt.trim(),
      duration: 10,
      aspectRatio: options.aspectRatio || '9:16',
      quality: options.quality || 'Standard',
    }

    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to start AI video generation')
    }

    return await response.json()
  },

  /**
   * Poll generation status until completed or failed
   */
  async getGenerationStatus(operationId: string): Promise<AIGenerationResponse> {
    const response = await fetch(`/api/generate-video/status/${operationId}`, {
      method: 'GET',
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to check video generation status')
    }

    return await response.json()
  },

  /**
   * Download or fetch blob from generated video URL
   */
  async downloadGeneratedVideo(videoUrl: string): Promise<Blob> {
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error('Could not download generated video asset')
    }
    return await response.blob()
  },
}
