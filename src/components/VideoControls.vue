<script setup lang="ts">
import { useVideoStore } from '@/stores/videoStore'
import { videoService } from '@/services/videoService'
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
} from 'lucide-vue-next'

const videoStore = useVideoStore()

function handleTogglePlay() {
  videoStore.togglePlay()
}

function handleStep(sec: number) {
  videoStore.step(sec)
}

function handleReset() {
  videoStore.seek(0)
}
</script>

<template>
  <div class="h-12 bg-[#12141c] border-t border-[#232733] px-4 flex items-center justify-between text-xs select-none">
    <!-- Left: Time & Clip segment indicator -->
    <div class="flex items-center gap-3">
      <div class="font-mono text-zinc-300 font-semibold tracking-wider text-xs">
        <span class="text-indigo-400">{{ videoService.formatTime(videoStore.currentTime, true) }}</span>
        <span class="text-zinc-600 mx-1">/</span>
        <span class="text-zinc-400">00:16.00</span>
      </div>

      <!-- Segment badge -->
      <span
        class="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
        :class="[
          videoStore.activeSegment === 'ai'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
        ]"
      >
        {{ videoStore.activeSegment === 'ai' ? 'Segment: AI (0-10s)' : 'Segment: User (10-16s)' }}
      </span>
    </div>

    <!-- Center: Play/Pause/Step Controls -->
    <div class="flex items-center gap-1.5">
      <button
        @click="handleReset"
        class="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
        title="Rewind to start (00:00)"
      >
        <RotateCcw class="w-3.5 h-3.5" />
      </button>

      <button
        @click="handleStep(-1)"
        class="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
        title="Step back 1s"
      >
        <SkipBack class="w-4 h-4" />
      </button>

      <button
        @click="handleTogglePlay"
        class="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition transform active:scale-95"
        title="Play / Pause (Space)"
      >
        <component :is="videoStore.isPlaying ? Pause : Play" class="w-4 h-4 fill-current ml-0.5" />
      </button>

      <button
        @click="handleStep(1)"
        class="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
        title="Step forward 1s"
      >
        <SkipForward class="w-4 h-4" />
      </button>
    </div>

    <!-- Right: Volume & Fullscreen -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5">
        <button
          @click="videoStore.toggleMute"
          class="text-zinc-400 hover:text-white p-1 rounded transition"
          title="Toggle Mute"
        >
          <component :is="videoStore.isMuted || videoStore.masterVolume === 0 ? VolumeX : Volume2" class="w-4 h-4" />
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          :value="videoStore.isMuted ? 0 : videoStore.masterVolume"
          @input="videoStore.setVolume(parseFloat(($event.target as HTMLInputElement).value))"
          class="w-16 accent-indigo-500 hidden sm:block"
        />
      </div>

      <button
        @click="videoStore.setFullscreen(!videoStore.isFullscreen)"
        class="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition"
        title="Fullscreen Preview"
      >
        <Maximize class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
