<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useVideoStore } from '@/stores/videoStore'
import { useEditorStore } from '@/stores/editorStore'
import { DEFAULT_CROP_SETTINGS } from '@/types/video'
import TextLayer from './TextLayer.vue'
import TextToolbar from './TextToolbar.vue'
import VideoControls from './VideoControls.vue'
import { Sparkles, Film, Video, AlertCircle } from 'lucide-vue-next'

const projectStore = useProjectStore()
const videoStore = useVideoStore()
const editorStore = useEditorStore()

const containerRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<HTMLDivElement | null>(null)
const aiVideoRef = ref<HTMLVideoElement | null>(null)
const userVideoRef = ref<HTMLVideoElement | null>(null)
const particleCanvasRef = ref<HTMLCanvasElement | null>(null)

const stageWidth = ref(0)
const stageHeight = ref(0)
const containerWidth = ref(360)
const containerHeight = ref(640)
let resizeObserver: ResizeObserver | null = null

// Particle animation state
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}
let particlesList: Particle[] = []
let particleAnimId: number | null = null

// Dynamically compute preview box size so it perfectly fits available stage space without overflow
const containerBoxStyle = computed(() => {
  if (!stageWidth.value || !stageHeight.value) {
    switch (projectStore.aspectRatio) {
      case '16:9':
        return { aspectRatio: '16/9', maxHeight: '100%', maxWidth: '100%' }
      case '1:1':
        return { aspectRatio: '1/1', maxHeight: '100%', maxWidth: '100%' }
      case '9:16':
      default:
        return { aspectRatio: '9/16', maxHeight: '100%', maxWidth: '100%' }
    }
  }

  const pad = 24 // stage safe padding
  const availW = Math.max(120, stageWidth.value - pad)
  const availH = Math.max(120, stageHeight.value - pad)

  let targetRatio = 9 / 16
  if (projectStore.aspectRatio === '16:9') targetRatio = 16 / 9
  else if (projectStore.aspectRatio === '1:1') targetRatio = 1 / 1

  let w = 0
  let h = 0

  if (availW / availH > targetRatio) {
    // Stage wider than aspect ratio -> bounded by height
    h = availH
    w = h * targetRatio
  } else {
    // Stage taller/narrower -> bounded by width
    w = availW
    h = w / targetRatio
  }

  return {
    width: `${Math.round(w)}px`,
    height: `${Math.round(h)}px`,
  }
})

// CSS Filter String computed from CapCut-style parameters (CapCut Dark Moody Tone)
const computedCssFilter = computed(() => {
  const f = projectStore.filters
  // Brightness (-100 to 100): CapCut dark grading + illumination + shadow & highlight compression
  const bShift = (f.brightness / 100) * 0.65 // -31 -> -0.2015
  const illumShift = (f.illumination / 100) * 0.25 // -10 -> -0.025
  const shadowDarkening = f.shadow < 0 ? (f.shadow / 100) * 0.20 : (f.shadow / 100) * 0.10 // -10 -> -0.020
  const highlightDarkening = f.highlight < 0 ? (f.highlight / 100) * 0.15 : (f.highlight / 100) * 0.05 // -10 -> -0.015
  const brightnessVal = Math.max(0.18, 1 + bShift + illumShift + shadowDarkening + highlightDarkening) // ~0.738
  
  // Contrast (-100 to 100): CapCut 20 midtone punch
  const contrastVal = Math.max(0.6, 1 + (f.contrast / 100) * 0.70) // 20 -> 1.14
  
  // Saturation (-100 to 100): CapCut -50 desaturation
  const saturateVal = Math.max(0.1, 1 + (f.saturation / 100) * 0.90) // -50 -> 0.55
  
  // Hue (-100 to 100 / -180 to 180): CapCut -18 direct degree rotation
  const hueRotateVal = f.hue

  // Sepia / Color Tone
  const sepiaVal = f.temperature > 0 ? (f.temperature / 100) * 0.25 : 0

  const filterList = [
    `brightness(${brightnessVal.toFixed(3)})`,
    `contrast(${contrastVal.toFixed(3)})`,
    `saturate(${saturateVal.toFixed(3)})`,
    `hue-rotate(${hueRotateVal}deg)`,
  ]

  if (sepiaVal > 0) {
    filterList.push(`sepia(${sepiaVal.toFixed(3)})`)
  }

  if (f.sharpen > 0) {
    filterList.push('url(#capcut-sharpen)')
  }

  return filterList.join(' ')
})

// Dynamic Sharpen Matrix for SVG feConvolveMatrix
const sharpenKernelMatrix = computed(() => {
  const s = (projectStore.filters.sharpen / 100) * 0.45
  const center = (1 + 4 * s).toFixed(3)
  const neg = (-s).toFixed(3)
  return `0 ${neg} 0 ${neg} ${center} ${neg} 0 ${neg} 0`
})

// Temperature Overlay (Cool cyan vs Warm amber) - Applied only to Clip 1 (0-10s)
const temperatureOverlayStyle = computed(() => {
  const clip1Weight = transitionEffect.value.aiOpacity
  if (clip1Weight <= 0) return { display: 'none' }
  const temp = projectStore.filters.temperature
  if (temp === 0) return { display: 'none' }
  const isWarm = temp > 0
  const color = isWarm ? '255, 160, 40' : '50, 140, 255'
  const alpha = (Math.abs(temp) / 100) * 0.20 * clip1Weight
  return {
    backgroundColor: `rgba(${color}, ${alpha})`,
    mixBlendMode: 'soft-light' as const,
  }
})

// Highlight & Shadow Compression Layer (CapCut shadow deepening) - Applied only to Clip 1 (0-10s)
const toneCurveOverlayStyle = computed(() => {
  const clip1Weight = transitionEffect.value.aiOpacity
  if (clip1Weight <= 0) return { display: 'none' }
  const { highlight, shadow } = projectStore.filters
  if (highlight === 0 && shadow === 0) return { display: 'none' }
  
  const isDarkening = highlight <= 0 && shadow <= 0
  const hlFactor = Math.abs(highlight / 100) * 0.40
  const shFactor = Math.abs(shadow / 100) * 0.40
  const totalAlpha = Math.min(0.45, hlFactor + shFactor) * clip1Weight
  
  return {
    backgroundColor: isDarkening ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.85)',
    opacity: totalAlpha.toFixed(3),
    mixBlendMode: isDarkening ? ('multiply' as const) : ('screen' as const),
  }
})

// Vignette overlay style (CapCut 50 radial falloff) - Applied only to Clip 1 (0-10s)
const vignetteOverlayStyle = computed(() => {
  const clip1Weight = transitionEffect.value.aiOpacity
  if (clip1Weight <= 0) return { display: 'none' }
  const v = projectStore.filters.vignette
  if (v <= 0) return { display: 'none' }
  const darkness = Math.min(0.92, (v / 100) * 1.15) * clip1Weight
  return {
    background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 25%, rgba(0,0,0,${(darkness * 0.50).toFixed(3)}) 62%, rgba(0,0,0,${darkness.toFixed(3)}) 96%)`,
  }
})

// Fade overlay style (Lifts dark floor to CapCut milky matte film tone) - Applied only to Clip 1 (0-10s)
const fadeOverlayStyle = computed(() => {
  const clip1Weight = transitionEffect.value.aiOpacity
  if (clip1Weight <= 0) return { display: 'none' }
  const fade = projectStore.filters.fade
  if (fade <= 0) return { display: 'none' }
  return {
    opacity: (((fade / 100) * 0.15) * clip1Weight).toFixed(3),
    backgroundColor: '#181920',
    mixBlendMode: 'screen' as const,
  }
})

// Transition between AI clip (0-10s) and User clip (10-16s)
const transitionEffect = computed(() => {
  const t = videoStore.currentTime
  const transType = projectStore.transition.type
  const transDur = projectStore.transition.duration || 0.5

  // Transition window centered around 10.0s (e.g. 9.75 to 10.25)
  const halfDur = transDur / 2
  const transStart = 10 - halfDur
  const transEnd = 10 + halfDur

  if (t < transStart || t > transEnd || transType === 'none') {
    return {
      aiOpacity: t < 10 ? 1 : 0,
      userOpacity: t >= 10 ? 1 : 0,
      blackOverlayOpacity: 0,
      transform: 'none',
    }
  }

  const progress = (t - transStart) / transDur // 0 to 1

  if (transType === 'fade') {
    // Dip to Black / Transisi Gelap (0.5s centered at 10.0s)
    const blackAlpha = 1 - Math.abs(progress - 0.5) * 2
    return {
      aiOpacity: t < 10 ? 1 : 0,
      userOpacity: t >= 10 ? 1 : 0,
      blackOverlayOpacity: Math.max(0, Math.min(1, blackAlpha)),
      transform: 'none',
    }
  }

  if (transType === 'crossfade') {
    return {
      aiOpacity: 1 - progress,
      userOpacity: progress,
      blackOverlayOpacity: 0,
      transform: 'none',
    }
  }

  if (transType === 'zoom') {
    return {
      aiOpacity: 1 - progress,
      userOpacity: progress,
      blackOverlayOpacity: 0,
      transform: `scale(${1 + (progress - 0.5) * 0.1})`,
    }
  }

  if (transType === 'slide') {
    return {
      aiOpacity: 1 - progress,
      userOpacity: progress,
      blackOverlayOpacity: 0,
      transform: `translateX(${(progress - 0.5) * -10}%)`,
    }
  }

  return {
    aiOpacity: t < 10 ? 1 : 0,
    userOpacity: t >= 10 ? 1 : 0,
    blackOverlayOpacity: 0,
    transform: 'none',
  }
})

// Crop & Transform styling for AI Video
const aiTransformStyle = computed(() => {
  const crop = projectStore.aiVideo?.crop || DEFAULT_CROP_SETTINGS
  const trans = transitionEffect.value.transform !== 'none' ? transitionEffect.value.transform : ''
  const transforms: string[] = []

  if (trans) transforms.push(trans)
  if (crop.x !== 0 || crop.y !== 0) {
    transforms.push(`translate(${crop.x}%, ${crop.y}%)`)
  }
  if (crop.scale && crop.scale !== 1) {
    transforms.push(`scale(${crop.scale})`)
  }
  if (crop.rotation) {
    transforms.push(`rotate(${crop.rotation}deg)`)
  }
  if (crop.flipH || crop.flipV) {
    transforms.push(`scale(${crop.flipH ? -1 : 1}, ${crop.flipV ? -1 : 1})`)
  }

  return transforms.length ? transforms.join(' ') : 'none'
})

const aiObjectFit = computed(() => {
  const crop = projectStore.aiVideo?.crop || DEFAULT_CROP_SETTINGS
  return crop.mode === 'fill' ? 'cover' : 'contain'
})

// Crop & Transform styling for User Video
const userTransformStyle = computed(() => {
  const crop = projectStore.userVideo?.crop || DEFAULT_CROP_SETTINGS
  const trans = transitionEffect.value.transform !== 'none' ? transitionEffect.value.transform : ''
  const transforms: string[] = []

  if (trans) transforms.push(trans)
  if (crop.x !== 0 || crop.y !== 0) {
    transforms.push(`translate(${crop.x}%, ${crop.y}%)`)
  }
  if (crop.scale && crop.scale !== 1) {
    transforms.push(`scale(${crop.scale})`)
  }
  if (crop.rotation) {
    transforms.push(`rotate(${crop.rotation}deg)`)
  }
  if (crop.flipH || crop.flipV) {
    transforms.push(`scale(${crop.flipH ? -1 : 1}, ${crop.flipV ? -1 : 1})`)
  }

  return transforms.length ? transforms.join(' ') : 'none'
})

const userObjectFit = computed(() => {
  const crop = projectStore.userVideo?.crop || DEFAULT_CROP_SETTINGS
  return crop.mode === 'fill' ? 'cover' : 'contain'
})

// Synchronize HTML5 video playback with videoStore.currentTime
function syncVideoElements() {
  const t = videoStore.currentTime

  if (t < 10) {
    // In AI clip segment
    if (aiVideoRef.value && projectStore.aiVideo) {
      if (Math.abs(aiVideoRef.value.currentTime - t) > 0.3) {
        aiVideoRef.value.currentTime = t
      }
      if (videoStore.isPlaying && aiVideoRef.value.paused) {
        aiVideoRef.value.play().catch(() => {})
      } else if (!videoStore.isPlaying && !aiVideoRef.value.paused) {
        aiVideoRef.value.pause()
      }
    }
    if (userVideoRef.value && !userVideoRef.value.paused) {
      userVideoRef.value.pause()
    }
  } else {
    // In User clip segment (10s to 16s)
    const userOffset = t - 10 // 0 to 6
    const userTrimStart = projectStore.userVideo?.trimStart || 0
    const targetUserTime = userTrimStart + userOffset

    if (userVideoRef.value && projectStore.userVideo) {
      if (Math.abs(userVideoRef.value.currentTime - targetUserTime) > 0.3) {
        userVideoRef.value.currentTime = targetUserTime
      }
      if (videoStore.isPlaying && userVideoRef.value.paused) {
        userVideoRef.value.play().catch(() => {})
      } else if (!videoStore.isPlaying && !userVideoRef.value.paused) {
        userVideoRef.value.pause()
      }
    }
    if (aiVideoRef.value && !aiVideoRef.value.paused) {
      aiVideoRef.value.pause()
    }
  }
}

// Watch currentTime for seeking
watch(() => videoStore.currentTime, () => {
  syncVideoElements()
})

// Watch play/pause
watch(() => videoStore.isPlaying, (playing) => {
  if (!playing) {
    aiVideoRef.value?.pause()
    userVideoRef.value?.pause()
  } else {
    syncVideoElements()
  }
})

// Watch volume & mute
watch([() => videoStore.masterVolume, () => videoStore.isMuted, () => projectStore.audio], () => {
  const volMultiplier = videoStore.isMuted ? 0 : videoStore.masterVolume

  if (aiVideoRef.value) {
    aiVideoRef.value.volume = (projectStore.audio.aiVolume / 100) * volMultiplier
  }
  if (userVideoRef.value) {
    userVideoRef.value.volume = (projectStore.audio.userVolume / 100) * volMultiplier
  }
}, { deep: true })

// Update container dimensions for text positioning
function updateDimensions() {
  if (stageRef.value) {
    stageWidth.value = stageRef.value.clientWidth
    stageHeight.value = stageRef.value.clientHeight
  }
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
    editorStore.previewWidth = containerRef.value.clientWidth
    editorStore.previewHeight = containerRef.value.clientHeight
  }
}

watch(containerBoxStyle, () => {
  requestAnimationFrame(() => {
    if (containerRef.value) {
      containerWidth.value = containerRef.value.clientWidth
      containerHeight.value = containerRef.value.clientHeight
      editorStore.previewWidth = containerRef.value.clientWidth
      editorStore.previewHeight = containerRef.value.clientHeight
    }
  })
})

// Realtime Particles Animation Engine
function initParticles() {
  const count = Math.max(0, Math.min(80, projectStore.filters.particles * 1.5))
  particlesList = []
  for (let i = 0; i < count; i++) {
    particlesList.push({
      x: Math.random() * containerWidth.value,
      y: Math.random() * containerHeight.value,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8 - 0.3,
      size: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.5 + 0.1,
    })
  }
}

function renderParticles() {
  const canvas = particleCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const particleStrength = projectStore.filters.particles
  if (particleStrength <= 0 || videoStore.currentTime >= 10) {
    particleAnimId = requestAnimationFrame(renderParticles)
    return
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'

  for (const p of particlesList) {
    p.x += p.vx
    p.y += p.vy

    // Wrap around bounds
    if (p.x < 0) p.x = canvas.width
    if (p.x > canvas.width) p.x = 0
    if (p.y < 0) p.y = canvas.height
    if (p.y > canvas.height) p.y = 0

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.globalAlpha = p.opacity * (particleStrength / 100)
    ctx.fill()
  }

  particleAnimId = requestAnimationFrame(renderParticles)
}

watch(() => projectStore.filters.particles, () => {
  initParticles()
})

onMounted(() => {
  updateDimensions()
  if (stageRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })
    resizeObserver.observe(stageRef.value)
  }
  window.addEventListener('resize', updateDimensions)
  initParticles()
  particleAnimId = requestAnimationFrame(renderParticles)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateDimensions)
  if (resizeObserver) resizeObserver.disconnect()
  if (particleAnimId) cancelAnimationFrame(particleAnimId)
})

function deselectText() {
  editorStore.setSelectedTextId(null)
}
</script>

<template>
  <div
    class="flex-1 bg-[#0b0c10] flex flex-col justify-between overflow-hidden relative"
    @click="deselectText"
  >
    <!-- Floating Text Toolbar if text is active -->
    <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <TextToolbar />
    </div>

    <!-- Video Stage Center -->
    <div ref="stageRef" class="flex-1 flex items-center justify-center p-3 sm:p-4 min-h-0 overflow-hidden relative">
      <div
        ref="containerRef"
        class="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#2d3242] ring-1 ring-white/10 flex items-center justify-center transition-all duration-200"
        :style="containerBoxStyle"
      >
        <!-- LAYER 0: AI Video Player (0s - 10s) -->
        <video
          v-if="projectStore.aiVideo?.url"
          ref="aiVideoRef"
          :src="projectStore.aiVideo.url"
          class="absolute inset-0 w-full h-full transition-all duration-150 pointer-events-none"
          :style="{
            opacity: transitionEffect.aiOpacity,
            filter: computedCssFilter,
            transform: aiTransformStyle,
            objectFit: aiObjectFit,
          }"
          playsinline
          muted
        ></video>

        <!-- Placeholder when AI video is empty -->
        <div
          v-if="!projectStore.aiVideo && videoStore.currentTime < 10"
          class="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-gradient-to-b from-[#141724] to-[#0f1118]"
        >
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2.5 animate-pulse">
            <Sparkles class="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span class="text-xs sm:text-sm font-semibold text-white mb-1">00:00 - 00:10: AI Video Track</span>
          <p class="text-[11px] sm:text-xs text-zinc-400 max-w-[220px] sm:max-w-xs leading-relaxed">
            Enter prompt in left sidebar and generate a 10s clip with Google Veo.
          </p>
        </div>

        <!-- LAYER 1: User Video Player (10s - 16s, NO filter applied) -->
        <video
          v-if="projectStore.userVideo?.url"
          ref="userVideoRef"
          :src="projectStore.userVideo.url"
          class="absolute inset-0 w-full h-full transition-all duration-150 pointer-events-none"
          :style="{
            opacity: transitionEffect.userOpacity,
            transform: userTransformStyle,
            objectFit: userObjectFit,
          }"
          playsinline
          muted
        ></video>

        <!-- Placeholder when User video is empty -->
        <div
          v-if="!projectStore.userVideo && videoStore.currentTime >= 10"
          class="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-gradient-to-b from-[#10192a] to-[#0d121c]"
        >
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2.5 animate-pulse">
            <Film class="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span class="text-xs sm:text-sm font-semibold text-white mb-1">00:10 - 00:16: User Video Track</span>
          <p class="text-[11px] sm:text-xs text-zinc-400 max-w-[220px] sm:max-w-xs leading-relaxed">
            Upload your 6-second video to complete the 16-second final video.
          </p>
        </div>

        <!-- LAYER 2: Particles Canvas Overlay -->
        <canvas
          ref="particleCanvasRef"
          :width="containerWidth"
          :height="containerHeight"
          class="absolute inset-0 pointer-events-none w-full h-full"
        ></canvas>

        <!-- LAYER 3: Temperature Overlay (Cool / Warm) -->
        <div
          class="absolute inset-0 pointer-events-none transition-opacity duration-150"
          :style="temperatureOverlayStyle"
        ></div>

        <!-- LAYER 4: Tone Curve / Highlight & Shadow Compression -->
        <div
          class="absolute inset-0 pointer-events-none transition-opacity duration-150"
          :style="toneCurveOverlayStyle"
        ></div>

        <!-- LAYER 5: Fade Overlay (Matte Black Film Lift) -->
        <div
          class="absolute inset-0 pointer-events-none transition-opacity duration-150"
          :style="fadeOverlayStyle"
        ></div>

        <!-- LAYER 6: Vignette Overlay (CapCut Radial Falloff) -->
        <div
          class="absolute inset-0 pointer-events-none"
          :style="vignetteOverlayStyle"
        ></div>

        <!-- LAYER: Transition Dip-to-Black Overlay (0.5s Transisi Gelap) -->
        <div
          v-if="transitionEffect.blackOverlayOpacity > 0"
          class="absolute inset-0 bg-black pointer-events-none z-10 transition-none"
          :style="{ opacity: transitionEffect.blackOverlayOpacity }"
        ></div>

        <!-- Hidden SVG filter definitions for hardware-accelerated Sharpening -->
        <svg class="sr-only absolute w-0 h-0" aria-hidden="true">
          <filter id="capcut-sharpen">
            <feConvolveMatrix
              order="3"
              preserveAlpha="true"
              :kernelMatrix="sharpenKernelMatrix"
            />
          </filter>
        </svg>

        <!-- LAYER 7: Interactive Text Layer -->
        <TextLayer
          :containerWidth="containerWidth"
          :containerHeight="containerHeight"
        />

        <!-- Watermark / Aspect Badge (Top Right) -->
        <div class="absolute top-3 right-3 bg-black/70 backdrop-blur px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-300 border border-white/10 pointer-events-none flex items-center gap-1 shadow-md">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          <span>{{ projectStore.aspectRatio }}</span>
        </div>
      </div>
    </div>

    <!-- Video Controls Footer -->
    <VideoControls />
  </div>
</template>
