<script setup lang="ts">
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import type { TransitionType } from '@/types/video'
import { Shuffle, Sparkles, Sliders } from 'lucide-vue-next'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const transitions: { type: TransitionType; label: string; desc: string }[] = [
  { type: 'none', label: 'None (Hard Cut)', desc: 'Direct instant cut at 00:10' },
  { type: 'fade', label: 'Fade to Black', desc: 'Smooth dip to black between clips' },
  { type: 'crossfade', label: 'Crossfade', desc: 'Seamless linear blend between clips' },
  { type: 'zoom', label: 'Zoom Punch', desc: 'Dynamic focal zoom push transition' },
  { type: 'slide', label: 'Slide Whip', desc: 'Fast directional push into user video' },
]

function selectTransition(type: TransitionType) {
  projectStore.transition.type = type
  editorStore.notify('info', `Transition set to ${type.toUpperCase()}`)
}
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-[#232733]">
      <div class="flex items-center gap-2">
        <Shuffle class="w-4 h-4 text-emerald-400" />
        <h3 class="text-sm font-semibold text-white">Split Transition (At 10s)</h3>
      </div>
      <span class="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
        AI &rarr; User
      </span>
    </div>

    <!-- Duration Slider (0.3s to 1.0s) -->
    <div class="p-3 rounded-lg bg-[#141620] border border-[#232733] space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="text-zinc-300 font-medium flex items-center gap-1.5">
          <Sliders class="w-3.5 h-3.5 text-emerald-400" />
          <span>Transition Duration</span>
        </span>
        <span class="font-mono text-emerald-400 text-xs font-semibold">{{ projectStore.transition.duration.toFixed(2) }}s</span>
      </div>
      <input
        type="range"
        min="0.3"
        max="1.0"
        step="0.05"
        v-model.number="projectStore.transition.duration"
        class="w-full accent-emerald-500"
      />
      <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
        <span>0.30s (Snappy)</span>
        <span>0.50s (Default)</span>
        <span>1.00s (Slow)</span>
      </div>
    </div>

    <!-- Transition Choices -->
    <div class="space-y-2">
      <div class="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
        Transition Style
      </div>

      <div class="space-y-2">
        <div
          v-for="item in transitions"
          :key="item.type"
          @click="selectTransition(item.type)"
          class="p-3 rounded-lg border cursor-pointer transition flex items-center justify-between"
          :class="[
            projectStore.transition.type === item.type
              ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-md'
              : 'bg-[#141620] border-[#232733] text-zinc-400 hover:text-white hover:bg-[#181c2a]'
          ]"
        >
          <div>
            <div class="text-xs font-semibold">{{ item.label }}</div>
            <div class="text-[11px] text-zinc-400">{{ item.desc }}</div>
          </div>
          <span
            v-if="projectStore.transition.type === item.type"
            class="w-2 h-2 rounded-full bg-emerald-400 shadow"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>
