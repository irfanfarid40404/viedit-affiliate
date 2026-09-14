<script setup lang="ts">
import { useProjectStore } from '@/stores/projectStore'
import { Wand2, Zap, Eye, Gauge } from 'lucide-vue-next'

const projectStore = useProjectStore()
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-[#232733]">
      <div class="flex items-center gap-2">
        <Wand2 class="w-4 h-4 text-purple-400" />
        <h3 class="text-sm font-semibold text-white">Visual Effects</h3>
      </div>
    </div>

    <!-- Speed Adjustment -->
    <div class="p-3 rounded-lg bg-[#141620] border border-[#232733] space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="text-zinc-300 font-medium flex items-center gap-1.5">
          <Gauge class="w-3.5 h-3.5 text-purple-400" />
          <span>Playback Speed</span>
        </span>
        <span class="font-mono text-purple-400 font-semibold text-xs">{{ projectStore.effects.speed }}x</span>
      </div>
      <input
        type="range"
        min="0.5"
        max="2.0"
        step="0.1"
        v-model.number="projectStore.effects.speed"
        class="w-full accent-purple-500"
      />
      <div class="flex justify-between text-[10px] text-zinc-500 font-mono">
        <span>0.5x Slow</span>
        <span>1.0x Normal</span>
        <span>2.0x Fast</span>
      </div>
    </div>

    <!-- Toggleable Stylistic Effects -->
    <div class="space-y-2">
      <div class="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
        Stylized Overlays
      </div>

      <div class="flex items-center justify-between p-3 rounded-lg bg-[#141620] border border-[#232733]">
        <div>
          <div class="text-xs font-semibold text-white">Film Grain Texture</div>
          <div class="text-[10px] text-zinc-400">Adds authentic analog 35mm film grain</div>
        </div>
        <input
          type="checkbox"
          v-model="projectStore.effects.grain"
          class="w-4 h-4 rounded accent-purple-500"
        />
      </div>

      <div class="flex items-center justify-between p-3 rounded-lg bg-[#141620] border border-[#232733]">
        <div>
          <div class="text-xs font-semibold text-white">Cyber Glitch</div>
          <div class="text-[10px] text-zinc-400">Subtle digital artifact glitch at key transitions</div>
        </div>
        <input
          type="checkbox"
          v-model="projectStore.effects.glitch"
          class="w-4 h-4 rounded accent-purple-500"
        />
      </div>

      <div class="flex items-center justify-between p-3 rounded-lg bg-[#141620] border border-[#232733]">
        <div>
          <div class="text-xs font-semibold text-white">Anamorphic Glow</div>
          <div class="text-[10px] text-zinc-400">Cinematic bloom and diffused light highlights</div>
        </div>
        <input
          type="checkbox"
          v-model="projectStore.effects.glow"
          class="w-4 h-4 rounded accent-purple-500"
        />
      </div>
    </div>
  </div>
</template>
