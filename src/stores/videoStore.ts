import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useVideoStore = defineStore('video', () => {
  const currentTime = ref<number>(0) // 0 to 16s
  const isPlaying = ref<boolean>(false)
  const masterVolume = ref<number>(1) // 0 to 1
  const isMuted = ref<boolean>(false)
  const isFullscreen = ref<boolean>(false)
  const playbackSpeed = ref<number>(1.0)
  const isLooping = ref<boolean>(true)

  let animationFrameId: number | null = null
  let lastTimestamp: number | null = null

  // Active clip segment: 0-10 is 'ai', 10-16 is 'user'
  const activeSegment = computed<'ai' | 'user'>(() => {
    return currentTime.value < 10 ? 'ai' : 'user'
  })

  // Offset inside current segment for video element
  const segmentCurrentTime = computed<number>(() => {
    if (currentTime.value < 10) {
      return currentTime.value // 0 to 10
    }
    return currentTime.value - 10 // 0 to 6
  })

  function play() {
    if (isPlaying.value) return
    isPlaying.value = true
    lastTimestamp = performance.now()
    tick()
  }

  function pause() {
    isPlaying.value = false
    lastTimestamp = null
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause()
    } else {
      if (currentTime.value >= 16) {
        currentTime.value = 0
      }
      play()
    }
  }

  function seek(time: number) {
    const clamped = Math.max(0, Math.min(16, time))
    currentTime.value = Number(clamped.toFixed(3))
  }

  function step(seconds: number) {
    seek(currentTime.value + seconds)
  }

  function tick() {
    if (!isPlaying.value) return

    const now = performance.now()
    if (lastTimestamp !== null) {
      const delta = (now - lastTimestamp) / 1000
      let nextTime = currentTime.value + delta * playbackSpeed.value
      if (nextTime >= 16) {
        if (isLooping.value) {
          nextTime = 0
        } else {
          nextTime = 16
          pause()
          currentTime.value = nextTime
          return
        }
      }
      currentTime.value = Number(nextTime.toFixed(3))
    }
    lastTimestamp = now
    animationFrameId = requestAnimationFrame(tick)
  }

  function setVolume(val: number) {
    masterVolume.value = Math.max(0, Math.min(1, val))
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
  }

  function setFullscreen(val: boolean) {
    isFullscreen.value = val
  }

  return {
    currentTime,
    isPlaying,
    masterVolume,
    isMuted,
    isFullscreen,
    playbackSpeed,
    isLooping,
    activeSegment,
    segmentCurrentTime,
    play,
    pause,
    togglePlay,
    seek,
    step,
    setVolume,
    toggleMute,
    setFullscreen,
  }
})
