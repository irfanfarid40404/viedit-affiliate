import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProjectState, EffectSettings } from '@/types/project'
import type { VideoClip, AspectRatio, AudioSettings, TransitionSettings, VideoCropSettings } from '@/types/video'
import { DEFAULT_CROP_SETTINGS } from '@/types/video'
import type { FilterSettings } from '@/types/filter'
import type { TextItem } from '@/types/text'
import { DEFAULT_FILTERS, RESET_FILTERS } from '@/types/filter'

export const useProjectStore = defineStore('project', () => {
  const id = ref<string>('project-' + Date.now())
  const name = ref<string>('Untitled AI Video')
  const aspectRatio = ref<AspectRatio>('9:16')
  const duration = ref<number>(16) // Strict 16s: 0-10s AI + 10-16s User

  const aiVideo = ref<VideoClip | null>(null)
  const userVideo = ref<VideoClip | null>(null)

  const filters = ref<FilterSettings>({ ...DEFAULT_FILTERS })

  const texts = ref<TextItem[]>([])

  const effects = ref<EffectSettings>({
    glitch: false,
    grain: true,
    lensDistortion: false,
    glow: false,
    speed: 1.0,
  })

  const audio = ref<AudioSettings>({
    aiVolume: 100,
    userVolume: 100,
    musicVolume: 60,
    isMuted: false,
    backgroundMusicUrl: '',
    backgroundMusicName: '',
  })

  const transition = ref<TransitionSettings>({
    type: 'fade',
    duration: 0.5,
  })

  // Set AI Video (strictly 10 seconds duration)
  function setAIVideo(clip: VideoClip) {
    aiVideo.value = {
      ...clip,
      startTime: 0,
      duration: 10,
      trimStart: 0,
      trimEnd: 10,
    }
  }

  function removeAIVideo() {
    if (aiVideo.value?.url && aiVideo.value.url.startsWith('blob:')) {
      URL.revokeObjectURL(aiVideo.value.url)
    }
    aiVideo.value = null
  }

  // Set User Video (strictly max 6 seconds duration)
  function setUserVideo(clip: VideoClip) {
    const rawDur = clip.duration || 6
    const trimEnd = Math.min(rawDur, 6)
    userVideo.value = {
      ...clip,
      startTime: 10,
      duration: 6,
      trimStart: 0,
      trimEnd: trimEnd,
    }
  }

  function updateUserTrim(start: number, end: number) {
    if (!userVideo.value) return
    const clampedStart = Math.max(0, start)
    const clampedEnd = Math.min(userVideo.value.duration, Math.max(clampedStart + 1, end))
    // Effective window shouldn't exceed 6 seconds
    const finalEnd = Math.min(clampedEnd, clampedStart + 6)
    userVideo.value.trimStart = clampedStart
    userVideo.value.trimEnd = finalEnd
  }

  function updateUserCrop(crop: Partial<VideoCropSettings>) {
    if (!userVideo.value) return
    userVideo.value.crop = {
      ...(userVideo.value.crop || { ...DEFAULT_CROP_SETTINGS }),
      ...crop,
    }
  }

  function updateAICrop(crop: Partial<VideoCropSettings>) {
    if (!aiVideo.value) return
    aiVideo.value.crop = {
      ...(aiVideo.value.crop || { ...DEFAULT_CROP_SETTINGS }),
      ...crop,
    }
  }

  function resetUserCrop() {
    if (!userVideo.value) return
    userVideo.value.crop = { ...DEFAULT_CROP_SETTINGS }
  }

  function resetAICrop() {
    if (!aiVideo.value) return
    aiVideo.value.crop = { ...DEFAULT_CROP_SETTINGS }
  }

  function removeUserVideo() {
    if (userVideo.value?.url && userVideo.value.url.startsWith('blob:')) {
      URL.revokeObjectURL(userVideo.value.url)
    }
    userVideo.value = null
  }

  function replaceUserVideoWithAIVideo() {
    if (!aiVideo.value) return

    const replacement = {
      ...aiVideo.value,
      id: 'user-replacement-' + Date.now(),
      name: `${aiVideo.value.name} (replacement)`,
      startTime: 10,
      duration: Math.min(aiVideo.value.duration, 6),
      trimStart: 0,
      trimEnd: Math.min(aiVideo.value.duration, 6),
    }

    if (userVideo.value?.url && userVideo.value.url.startsWith('blob:')) {
      URL.revokeObjectURL(userVideo.value.url)
    }

    userVideo.value = replacement
  }

  function replaceAIVideoWithUserVideo() {
    if (!userVideo.value) return

    const replacement = {
      ...userVideo.value,
      id: 'ai-replacement-' + Date.now(),
      name: `${userVideo.value.name} (AI replacement)`,
      startTime: 0,
      duration: Math.min(userVideo.value.duration, 10),
      trimStart: 0,
      trimEnd: Math.min(userVideo.value.duration, 10),
    }

    if (aiVideo.value?.url && aiVideo.value.url.startsWith('blob:')) {
      URL.revokeObjectURL(aiVideo.value.url)
    }

    aiVideo.value = replacement
  }

  // Text management
  function addText(customText: string = 'YOUR TEXT HERE') {
    const newText: TextItem = {
      id: 'text-' + Date.now(),
      text: customText,
      fontFamily: 'Classic',
      fontSize: 36,
      color: '#ffffff',
      x: 50, // center %
      y: 50, // center %
      rotation: 0,
      scale: 1,
      opacity: 1,
      startTime: 2,
      endTime: 8,
      bold: true,
      italic: false,
      underline: false,
      shadow: {
        enabled: true,
        color: '#000000',
        blur: 10,
        offsetX: 2,
        offsetY: 2,
      },
      stroke: {
        enabled: false,
        color: '#000000',
        width: 2,
      },
      textAlign: 'center',
    }
    texts.value.push(newText)
    return newText.id
  }

  function updateText(id: string, updates: Partial<TextItem>) {
    const index = texts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      const merged = { ...texts.value[index], ...updates }
      if (merged.startTime !== undefined) {
        merged.startTime = Math.max(0, Math.min(9.5, merged.startTime))
      }
      if (merged.endTime !== undefined) {
        merged.endTime = Math.min(10, Math.max((merged.startTime || 0) + 0.5, merged.endTime))
      }
      texts.value[index] = merged
    }
  }

  function deleteText(id: string) {
    texts.value = texts.value.filter((t) => t.id !== id)
  }

  function duplicateText(id: string) {
    const item = texts.value.find((t) => t.id === id)
    if (!item) return
    const duplicated: TextItem = {
      ...JSON.parse(JSON.stringify(item)),
      id: 'text-' + Date.now(),
      x: Math.min(item.x + 5, 90),
      y: Math.min(item.y + 5, 90),
    }
    texts.value.push(duplicated)
    return duplicated.id
  }

  // Filters
  function setFilter(key: keyof FilterSettings, value: number) {
    filters.value[key] = value
  }

  function resetAllFilters() {
    filters.value = { ...RESET_FILTERS }
  }

  function applyDefaultPreset() {
    filters.value = { ...DEFAULT_FILTERS }
  }

  // Export full state JSON
  function getProjectExport(): ProjectState {
    return {
      id: id.value,
      name: name.value,
      aspectRatio: aspectRatio.value,
      duration: duration.value,
      aiVideo: aiVideo.value,
      userVideo: userVideo.value,
      filters: { ...filters.value },
      texts: [...texts.value],
      effects: { ...effects.value },
      audio: { ...audio.value },
      transition: { ...transition.value },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  return {
    id,
    name,
    aspectRatio,
    duration,
    aiVideo,
    userVideo,
    filters,
    texts,
    effects,
    audio,
    transition,
    setAIVideo,
    removeAIVideo,
    setUserVideo,
    updateUserTrim,
    updateUserCrop,
    updateAICrop,
    resetUserCrop,
    resetAICrop,
    removeUserVideo,
    replaceUserVideoWithAIVideo,
    replaceAIVideoWithUserVideo,
    addText,
    updateText,
    deleteText,
    duplicateText,
    setFilter,
    resetAllFilters,
    applyDefaultPreset,
    getProjectExport,
  }
})
