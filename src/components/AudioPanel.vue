<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import { Volume2, VolumeX, Music, Mic, Check } from 'lucide-vue-next'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const musicPresets = [
  { id: 'track-cyber', name: 'Cyberpunk Synth Drive', genre: 'Electronic / Cinematic' },
  { id: 'track-epic', name: 'Epic Cinematic Ambient', genre: 'Orchestral' },
  { id: 'track-lofi', name: 'Chill Lo-Fi Beat', genre: 'Lo-Fi / Hip Hop' },
]

function selectMusicPreset(item: typeof musicPresets[0]) {
  projectStore.audio.backgroundMusicName = item.name
  editorStore.notify('success', `Selected music: ${item.name}`)
}

function removeMusic() {
  projectStore.audio.backgroundMusicName = ''
  projectStore.audio.backgroundMusicUrl = ''
  editorStore.notify('info', 'Background music removed')
}
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-[#232733]">
      <div class="flex items-center gap-2">
        <Volume2 class="w-4 h-4 text-cyan-400" />
        <h3 class="text-sm font-semibold text-white">Audio & Sound Mixing</h3>
      </div>
      <button
        @click="projectStore.audio.isMuted = !projectStore.audio.isMuted"
        class="text-xs px-2.5 py-1 rounded flex items-center gap-1 transition"
        :class="projectStore.audio.isMuted ? 'bg-red-500/20 text-red-300' : 'bg-zinc-800 text-zinc-300 hover:text-white'"
      >
        <component :is="projectStore.audio.isMuted ? VolumeX : Volume2" class="w-3.5 h-3.5" />
        <span>{{ projectStore.audio.isMuted ? 'Muted' : 'Mute All' }}</span>
      </button>
    </div>

    <!-- Volume Sliders -->
    <div class="space-y-4">
      <!-- AI Video Volume -->
      <div class="p-3 rounded-lg bg-[#141620] border border-[#232733] space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium flex items-center gap-1.5">
            <Mic class="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Video Volume (0-10s)</span>
          </span>
          <span class="font-mono text-emerald-400 text-xs font-semibold">{{ projectStore.audio.aiVolume }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="projectStore.audio.aiVolume"
          class="w-full accent-emerald-500"
        />
      </div>

      <!-- User Video Volume -->
      <div class="p-3 rounded-lg bg-[#141620] border border-[#232733] space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium flex items-center gap-1.5">
            <Mic class="w-3.5 h-3.5 text-blue-400" />
            <span>User Video Volume (10-16s)</span>
          </span>
          <span class="font-mono text-blue-400 text-xs font-semibold">{{ projectStore.audio.userVolume }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="projectStore.audio.userVolume"
          class="w-full accent-blue-500"
        />
      </div>

      <!-- Background Music Volume -->
      <div class="p-3 rounded-lg bg-[#141620] border border-[#232733] space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium flex items-center gap-1.5">
            <Music class="w-3.5 h-3.5 text-cyan-400" />
            <span>Background Music Volume</span>
          </span>
          <span class="font-mono text-cyan-400 text-xs font-semibold">{{ projectStore.audio.musicVolume }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="projectStore.audio.musicVolume"
          class="w-full accent-cyan-500"
        />
      </div>
    </div>

    <!-- Background Music Preset Selector -->
    <div class="space-y-2 pt-2 border-t border-[#232733]">
      <div class="flex items-center justify-between">
        <span class="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
          Soundtrack / BGM
        </span>
        <button
          v-if="projectStore.audio.backgroundMusicName"
          @click="removeMusic"
          class="text-[10px] text-red-400 hover:underline"
        >
          Remove BGM
        </button>
      </div>

      <div class="space-y-1.5">
        <div
          v-for="item in musicPresets"
          :key="item.id"
          @click="selectMusicPreset(item)"
          class="p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between"
          :class="[
            projectStore.audio.backgroundMusicName === item.name
              ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
              : 'bg-[#141620] border-[#232733] text-zinc-400 hover:text-white hover:bg-[#181c2a]'
          ]"
        >
          <div>
            <div class="text-xs font-medium">{{ item.name }}</div>
            <div class="text-[10px] text-zinc-500">{{ item.genre }}</div>
          </div>
          <Check
            v-if="projectStore.audio.backgroundMusicName === item.name"
            class="w-4 h-4 text-cyan-400"
          />
        </div>
      </div>
    </div>
  </div>
</template>
