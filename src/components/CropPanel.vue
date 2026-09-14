<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useVideoStore } from '@/stores/videoStore'
import { useEditorStore } from '@/stores/editorStore'
import { DEFAULT_CROP_SETTINGS } from '@/types/video'
import type { VideoCropSettings } from '@/types/video'
import {
  Crop,
  Maximize2,
  Minimize2,
  Sliders,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
  Film,
  Sparkles,
  Smartphone,
  Monitor,
  Square,
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const videoStore = useVideoStore()
const editorStore = useEditorStore()

const activeTarget = ref<'user' | 'ai'>('user')

const currentClip = computed(() => {
  return activeTarget.value === 'user' ? projectStore.userVideo : projectStore.aiVideo
})

const currentCrop = computed<VideoCropSettings>(() => {
  if (activeTarget.value === 'user') {
    return projectStore.userVideo?.crop || { ...DEFAULT_CROP_SETTINGS }
  }
  return projectStore.aiVideo?.crop || { ...DEFAULT_CROP_SETTINGS }
})

function updateCrop(partial: Partial<VideoCropSettings>) {
  if (activeTarget.value === 'user') {
    projectStore.updateUserCrop(partial)
  } else {
    projectStore.updateAICrop(partial)
  }
}

function setMode(mode: 'fit' | 'fill' | 'custom') {
  if (mode === 'fit') {
    updateCrop({ mode: 'fit', scale: 1, x: 0, y: 0 })
  } else if (mode === 'fill') {
    updateCrop({ mode: 'fill', scale: 1, x: 0, y: 0 })
  } else {
    updateCrop({ mode: 'custom' })
  }
}

function handleRotate() {
  const currentRot = currentCrop.value.rotation || 0
  const nextRot = (currentRot + 90) % 360
  updateCrop({ rotation: nextRot })
}

function handleFlipH() {
  updateCrop({ flipH: !currentCrop.value.flipH })
}

function handleFlipV() {
  updateCrop({ flipV: !currentCrop.value.flipV })
}

function handleReset() {
  if (activeTarget.value === 'user') {
    projectStore.resetUserCrop()
  } else {
    projectStore.resetAICrop()
  }
  editorStore.notify('info', `Crop settings reset for ${activeTarget.value === 'user' ? 'User' : 'AI'} video`)
}

function selectTarget(target: 'user' | 'ai') {
  activeTarget.value = target
  if (target === 'user') {
    videoStore.seek(11)
  } else {
    videoStore.seek(2)
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Panel Header -->
    <div class="flex items-center justify-between pb-2 border-b border-[#232733]">
      <div class="flex items-center gap-2">
        <Crop class="w-4 h-4 text-indigo-400" />
        <h3 class="text-sm font-semibold text-white">Crop & Scale</h3>
      </div>
      <button
        @click="handleReset"
        class="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
        title="Reset crop settings"
      >
        <RotateCcw class="w-3 h-3" />
        <span>Reset</span>
      </button>
    </div>

    <!-- Target Selector (User Video vs AI Video) -->
    <div class="space-y-1.5">
      <label class="text-[11px] font-medium text-zinc-400">Select Clip to Crop</label>
      <div class="grid grid-cols-2 gap-2">
        <button
          @click="selectTarget('user')"
          class="py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition"
          :class="[
            activeTarget === 'user'
              ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
              : 'bg-[#151824] border-[#252a3a] text-zinc-400 hover:text-zinc-200'
          ]"
        >
          <Film class="w-3.5 h-3.5 text-blue-400" />
          <span>User Video (6s)</span>
        </button>

        <button
          @click="selectTarget('ai')"
          class="py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition"
          :class="[
            activeTarget === 'ai'
              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-semibold'
              : 'bg-[#151824] border-[#252a3a] text-zinc-400 hover:text-zinc-200'
          ]"
        >
          <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
          <span>AI Video (10s)</span>
        </button>
      </div>
    </div>

    <!-- Warning if clip not loaded -->
    <div
      v-if="!currentClip"
      class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2"
    >
      <span>No video loaded for {{ activeTarget === 'user' ? 'Track 2 (User Video)' : 'Track 1 (AI Video)' }}. Upload or generate a video first.</span>
    </div>

    <!-- Framing Modes -->
    <div class="space-y-2">
      <label class="text-[11px] font-medium text-zinc-400">Framing / Crop Mode</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          @click="setMode('fit')"
          class="py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition text-center"
          :class="[
            currentCrop.mode === 'fit'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
              : 'bg-[#141620] border-[#232733] text-zinc-400 hover:text-zinc-200'
          ]"
        >
          <Minimize2 class="w-4 h-4" />
          <span class="text-[11px]">Fit (Full)</span>
          <span class="text-[9px] text-zinc-500">Letterbox bars</span>
        </button>

        <button
          @click="setMode('fill')"
          class="py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition text-center"
          :class="[
            currentCrop.mode === 'fill'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
              : 'bg-[#141620] border-[#232733] text-zinc-400 hover:text-zinc-200'
          ]"
        >
          <Maximize2 class="w-4 h-4" />
          <span class="text-[11px]">Fill (Cover)</span>
          <span class="text-[9px] text-zinc-500">Crop to edge</span>
        </button>

        <button
          @click="setMode('custom')"
          class="py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition text-center"
          :class="[
            currentCrop.mode === 'custom'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
              : 'bg-[#141620] border-[#232733] text-zinc-400 hover:text-zinc-200'
          ]"
        >
          <Sliders class="w-4 h-4" />
          <span class="text-[11px]">Custom</span>
          <span class="text-[9px] text-zinc-500">Zoom & Pan</span>
        </button>
      </div>
    </div>

    <!-- Manual Transform Controls (Scale & Pan) -->
    <div class="p-3.5 rounded-xl bg-[#141620] border border-[#232733] space-y-4">
      <div class="text-xs font-semibold text-zinc-300 flex items-center justify-between">
        <span>Zoom & Position Adjustment</span>
        <span class="text-[10px] text-indigo-400 font-mono">
          {{ Math.round(currentCrop.scale * 100) }}%
        </span>
      </div>

      <!-- Scale / Zoom Slider -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Scale / Zoom</span>
          <span class="font-mono text-zinc-300">{{ currentCrop.scale.toFixed(2) }}x</span>
        </div>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          :value="currentCrop.scale"
          @input="updateCrop({ mode: 'custom', scale: parseFloat(($event.target as HTMLInputElement).value) })"
          class="w-full accent-indigo-500"
        />
        <div class="flex justify-between text-[9px] text-zinc-500 font-mono">
          <span>1.0x (Normal)</span>
          <span>2.0x</span>
          <span>3.0x (Max)</span>
        </div>
      </div>

      <!-- Pan X Slider -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Pan Horizontal (X)</span>
          <span class="font-mono text-zinc-300">{{ currentCrop.x }}%</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          step="1"
          :value="currentCrop.x"
          @input="updateCrop({ mode: 'custom', x: parseInt(($event.target as HTMLInputElement).value) })"
          class="w-full accent-indigo-500"
        />
        <div class="flex justify-between text-[9px] text-zinc-500 font-mono">
          <span>-50% (Left)</span>
          <span>Center</span>
          <span>+50% (Right)</span>
        </div>
      </div>

      <!-- Pan Y Slider -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Pan Vertical (Y)</span>
          <span class="font-mono text-zinc-300">{{ currentCrop.y }}%</span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          step="1"
          :value="currentCrop.y"
          @input="updateCrop({ mode: 'custom', y: parseInt(($event.target as HTMLInputElement).value) })"
          class="w-full accent-indigo-500"
        />
        <div class="flex justify-between text-[9px] text-zinc-500 font-mono">
          <span>-50% (Top)</span>
          <span>Center</span>
          <span>+50% (Bottom)</span>
        </div>
      </div>
    </div>

    <!-- Rotation & Flip Controls -->
    <div class="p-3.5 rounded-xl bg-[#141620] border border-[#232733] space-y-3">
      <div class="text-xs font-semibold text-zinc-300">
        Transform & Orientation
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          @click="handleRotate"
          class="py-2 px-2 rounded-lg bg-[#181b28] hover:bg-[#202538] border border-[#272d3e] text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
        >
          <RotateCw class="w-3.5 h-3.5 text-indigo-400" />
          <span>Rotate {{ currentCrop.rotation ? `${currentCrop.rotation}°` : '90°' }}</span>
        </button>

        <button
          @click="handleFlipH"
          class="py-2 px-2 rounded-lg border text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
          :class="[
            currentCrop.flipH
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
              : 'bg-[#181b28] hover:bg-[#202538] border-[#272d3e]'
          ]"
        >
          <FlipHorizontal class="w-3.5 h-3.5 text-indigo-400" />
          <span>Flip H</span>
        </button>

        <button
          @click="handleFlipV"
          class="py-2 px-2 rounded-lg border text-zinc-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
          :class="[
            currentCrop.flipV
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
              : 'bg-[#181b28] hover:bg-[#202538] border-[#272d3e]'
          ]"
        >
          <FlipVertical class="w-3.5 h-3.5 text-indigo-400" />
          <span>Flip V</span>
        </button>
      </div>
    </div>

    <!-- Quick Info Tip -->
    <div class="text-[11px] text-zinc-500 p-2.5 rounded-lg bg-[#12141c] border border-white/5 space-y-1">
      <div class="text-zinc-400 font-medium">💡 Pro Tips:</div>
      <p>• Use <strong>Fill (Cover)</strong> to convert horizontal 16:9 video to full screen 9:16 vertical without black bars.</p>
      <p>• Use <strong>Scale & Pan</strong> to zoom into a product or specific person in the frame.</p>
    </div>
  </div>
</template>
