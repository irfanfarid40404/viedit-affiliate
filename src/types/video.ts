export type AspectRatio = '9:16' | '16:9' | '1:1'

export type VideoGenerationStatus =
  | 'idle'
  | 'Preparing'
  | 'Generating'
  | 'Processing'
  | 'Completed'
  | 'Failed'

export interface VideoCropSettings {
  mode: 'fit' | 'fill' | 'custom'
  scale: number // 1.0 to 3.0 (zoom to crop)
  x: number // -50 to 50 (% offset)
  y: number // -50 to 50 (% offset)
  rotation: number // 0, 90, 180, 270
  flipH: boolean
  flipV: boolean
}

export const DEFAULT_CROP_SETTINGS: VideoCropSettings = {
  mode: 'fit',
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
  flipH: false,
  flipV: false,
}

export interface VideoClip {
  id: string
  url: string
  file?: File
  name: string
  duration: number
  startTime: number // position in timeline (0 for AI, 10 for User)
  trimStart: number // in source video
  trimEnd: number // in source video
  size?: number
  thumbnailUrl?: string
  width?: number
  height?: number
  crop?: VideoCropSettings
}

export type TransitionType = 'none' | 'fade' | 'crossfade' | 'zoom' | 'slide'

export interface TransitionSettings {
  type: TransitionType
  duration: number // 0.3 to 1.0 seconds
}

export interface AudioSettings {
  aiVolume: number // 0 to 100
  userVolume: number // 0 to 100
  musicVolume: number // 0 to 100
  isMuted: boolean
  backgroundMusicUrl?: string
  backgroundMusicName?: string
}

export interface AIGenerationRequest {
  prompt: string
  duration: number // always 10
  aspectRatio: AspectRatio
  quality?: 'Standard' | 'High'
}

export interface AIGenerationResponse {
  success: boolean
  operationId?: string
  status?: VideoGenerationStatus
  videoUrl?: string
  duration?: number
  error?: string
}
