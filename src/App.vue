<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useVideoStore } from '@/stores/videoStore'

const videoStore = useVideoStore()

// Global keyboard shortcuts (Space for Play/Pause, Left/Right for Step)
function handleKeydown(e: KeyboardEvent) {
  // Ignore if typing in input or textarea
  const target = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
    return
  }

  if (e.code === 'Space') {
    e.preventDefault()
    videoStore.togglePlay()
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault()
    videoStore.step(-1)
  } else if (e.code === 'ArrowRight') {
    e.preventDefault()
    videoStore.step(1)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <router-view />
</template>
