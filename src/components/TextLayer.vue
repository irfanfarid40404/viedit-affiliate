<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useVideoStore } from '@/stores/videoStore'
import { useEditorStore } from '@/stores/editorStore'
import { FONT_OPTIONS } from '@/types/text'
import type { TextItem } from '@/types/text'
import { RotateCw } from 'lucide-vue-next'

const projectStore = useProjectStore()
const videoStore = useVideoStore()
const editorStore = useEditorStore()

const props = defineProps<{
  containerWidth: number
  containerHeight: number
}>()

// Active texts visible at currentTime (Strictly Klip 1: 0 - 10s only)
const visibleTexts = computed(() => {
  const t = videoStore.currentTime
  if (t >= 10) return []
  return projectStore.texts.filter((item) => t >= item.startTime && t <= Math.min(10, item.endTime))
})

function getFontFamilyCss(label: string): string {
  const opt = FONT_OPTIONS.find((f) => f.label === label)
  return opt ? opt.fontFamily : 'system-ui'
}

function getTextShadowCss(item: TextItem): string {
  if (!item.shadow.enabled) return 'none'
  const r = (props.containerHeight || 640) / 1280
  return `${(item.shadow.offsetX * r).toFixed(1)}px ${(item.shadow.offsetY * r).toFixed(1)}px ${(item.shadow.blur * r).toFixed(1)}px ${item.shadow.color}`
}

function getWebkitStroke(item: TextItem): string {
  if (!item.stroke.enabled) return 'none'
  const r = (props.containerHeight || 640) / 1280
  return `${Math.max(1, item.stroke.width * r).toFixed(1)}px ${item.stroke.color}`
}

// Dragging, rotating & scaling logic
let isDragging = false
let isRotating = false
const isScaling = ref(false)
const isSnappedX = ref(false)
const isSnappedY = ref(false)
let startX = 0
let startY = 0
let initialItemX = 0
let initialItemY = 0
let scaleCenterX = 0
let scaleCenterY = 0
let initialDist = 0
let initialScale = 1
let currentActiveItem: TextItem | null = null

function onPointerDownText(e: PointerEvent, item: TextItem) {
  e.stopPropagation()
  editorStore.setSelectedTextId(item.id)
  isDragging = true
  currentActiveItem = item
  startX = e.clientX
  startY = e.clientY
  initialItemX = item.x
  initialItemY = item.y

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerDownRotate(e: PointerEvent, item: TextItem) {
  e.stopPropagation()
  isRotating = true
  currentActiveItem = item
  startX = e.clientX
  startY = e.clientY

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerDownScale(e: PointerEvent, item: TextItem) {
  e.stopPropagation()
  isScaling.value = true
  currentActiveItem = item

  const parentBox = (e.currentTarget as HTMLElement).closest('.text-bounding-box')
  if (parentBox) {
    const rect = parentBox.getBoundingClientRect()
    scaleCenterX = rect.left + rect.width / 2
    scaleCenterY = rect.top + rect.height / 2
  } else {
    scaleCenterX = e.clientX
    scaleCenterY = e.clientY
  }

  initialDist = Math.hypot(e.clientX - scaleCenterX, e.clientY - scaleCenterY) || 1
  initialScale = item.scale || 1

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onWheelScale(e: WheelEvent, item: TextItem) {
  const delta = e.deltaY < 0 ? 0.05 : -0.05
  const newScale = Math.max(0.2, Math.min(3.5, (item.scale || 1) + delta))
  item.scale = Number(newScale.toFixed(2))
}

function onPointerMove(e: PointerEvent) {
  if (!currentActiveItem) return

  if (isDragging && props.containerWidth > 0 && props.containerHeight > 0) {
    const deltaX = ((e.clientX - startX) / props.containerWidth) * 100
    const deltaY = ((e.clientY - startY) / props.containerHeight) * 100
    let nextX = initialItemX + deltaX
    let nextY = initialItemY + deltaY

    // Magnetic snap to dead-center (50%)
    if (Math.abs(nextX - 50) < 2.5) {
      nextX = 50
      isSnappedX.value = true
    } else {
      isSnappedX.value = false
    }

    if (Math.abs(nextY - 50) < 2.5) {
      nextY = 50
      isSnappedY.value = true
    } else {
      isSnappedY.value = false
    }

    currentActiveItem.x = Math.max(5, Math.min(95, Number(nextX.toFixed(1))))
    currentActiveItem.y = Math.max(5, Math.min(95, Number(nextY.toFixed(1))))
  } else if (isRotating) {
    const deltaX = e.clientX - startX
    currentActiveItem.rotation = Math.round((currentActiveItem.rotation + deltaX * 0.5) % 360)
    startX = e.clientX
  } else if (isScaling.value) {
    const currentDist = Math.hypot(e.clientX - scaleCenterX, e.clientY - scaleCenterY)
    const factor = currentDist / initialDist
    const newScale = Math.max(0.2, Math.min(3.5, initialScale * factor))
    currentActiveItem.scale = Number(newScale.toFixed(2))
  }
}

function onPointerUp() {
  isDragging = false
  isRotating = false
  isScaling.value = false
  isSnappedX.value = false
  isSnappedY.value = false
  currentActiveItem = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}
</script>

<template>
  <div class="absolute inset-0 pointer-events-none overflow-hidden select-none">
    <!-- Center Guide Alignment Lines (Magnetic Snap) -->
    <div
      v-if="isSnappedX"
      class="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)] pointer-events-none z-30 animate-pulse"
    ></div>
    <div
      v-if="isSnappedY"
      class="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)] pointer-events-none z-30 animate-pulse"
    ></div>

    <div
      v-for="item in visibleTexts"
      :key="item.id"
      class="absolute pointer-events-auto cursor-grab active:cursor-grabbing transition-shadow w-max max-w-none"
      :style="{
        left: `${item.x}%`,
        top: `${item.y}%`,
        transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
        opacity: item.opacity,
      }"
      @pointerdown="onPointerDownText($event, item)"
    >
      <!-- Bounding Box when selected -->
      <div
        class="text-bounding-box relative px-3 py-1.5 transition rounded w-max max-w-none"
        :class="[
          editorStore.selectedTextId === item.id
            ? 'border-2 border-dashed border-indigo-400 bg-indigo-500/10 shadow-lg'
            : 'border border-transparent hover:border-white/30'
        ]"
        @wheel.prevent.stop="onWheelScale($event, item)"
      >
        <!-- Rotation Handle on top -->
        <div
          v-if="editorStore.selectedTextId === item.id"
          class="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center cursor-alias shadow hover:scale-110 transition z-20"
          title="Drag to rotate"
          @pointerdown.stop="onPointerDownRotate($event, item)"
        >
          <RotateCw class="w-3 h-3" />
        </div>

        <!-- 4 Corner Scale / Resize Handles -->
        <template v-if="editorStore.selectedTextId === item.id">
          <!-- Top Left -->
          <div
            class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nwse-resize hover:scale-125 z-20 transition-transform"
            title="Tarik untuk memperkecil/memperbesar"
            @pointerdown.stop="onPointerDownScale($event, item)"
          ></div>
          <!-- Top Right -->
          <div
            class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nesw-resize hover:scale-125 z-20 transition-transform"
            title="Tarik untuk memperkecil/memperbesar"
            @pointerdown.stop="onPointerDownScale($event, item)"
          ></div>
          <!-- Bottom Left -->
          <div
            class="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nesw-resize hover:scale-125 z-20 transition-transform"
            title="Tarik untuk memperkecil/memperbesar"
            @pointerdown.stop="onPointerDownScale($event, item)"
          ></div>
          <!-- Bottom Right -->
          <div
            class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full shadow-md cursor-nwse-resize hover:scale-125 z-20 transition-transform"
            title="Tarik untuk memperkecil/memperbesar"
            @pointerdown.stop="onPointerDownScale($event, item)"
          ></div>

          <!-- Scale Indicator Pill -->
          <div
            v-if="isScaling && editorStore.selectedTextId === item.id"
            class="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/90 text-indigo-300 text-[10px] font-mono border border-indigo-500/50 shadow pointer-events-none z-20"
          >
            {{ Math.round((item.scale || 1) * 100) }}%
          </div>
        </template>

        <!-- Rendered Text Content (Proportionally scaled to 720x1280 canonical video) -->
        <span
          class="block whitespace-pre select-none"
          :style="{
            fontFamily: getFontFamilyCss(item.fontFamily),
            fontSize: `${((item.fontSize || 32) * ((props.containerHeight || 640) / 1280)).toFixed(2)}px`,
            color: item.color,
            fontWeight: item.bold ? 'bold' : 'normal',
            fontStyle: item.italic ? 'italic' : 'normal',
            textDecoration: item.underline ? 'underline' : 'none',
            textAlign: item.textAlign || 'center',
            textShadow: getTextShadowCss(item),
            WebkitTextStroke: getWebkitStroke(item),
            letterSpacing: item.letterSpacing ? `${(item.letterSpacing * ((props.containerHeight || 640) / 1280)).toFixed(2)}px` : undefined,
            lineHeight: item.lineHeight || 1.25,
          }"
        >
          {{ item.text || 'YOUR TEXT HERE' }}
        </span>
      </div>
    </div>
  </div>
</template>
