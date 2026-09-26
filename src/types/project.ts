import type { AspectRatio, AudioSettings, TransitionSettings, VideoClip } from './video'
import type { FilterSettings } from './filter'
import type { TextItem } from './text'

export interface EffectSettings {
  glitch: boolean
  grain: boolean
  lensDistortion: boolean
  glow: boolean
  speed: number // 0.5 to 2.0
}

export interface ProjectState {
  id: string
  name: string
  aspectRatio: AspectRatio
  duration: number // 16 seconds standard
  aiVideo: VideoClip | null
  userVideo: VideoClip | null
  filters: FilterSettings
  texts: TextItem[]
  effects: EffectSettings
  audio: AudioSettings
  transition: TransitionSettings
  createdAt: number
  updatedAt: number
}
