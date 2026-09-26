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
    <div class="flex items-center justify-between pb-2 border-b border-[#2c2c2c]">
      <div class="flex items-center gap-2">
        <Volume2 class="w-4 h-4 text-zinc-500" />
        <h3 class="text-sm font-medium text-zinc-100">Audio & Sound Mixing</h3>
      </div>
      <button
        @click="projectStore.audio.isMuted = !projectStore.audio.isMuted"
        class="text-xs px-2.5 py-1 rounded flex items-center gap-1 transition"
        :class="projectStore.audio.isMuted ? 'bg-[#2e2626] text-[#d9a8a8] border border-[#4a3333]' : 'bg-[#262626] text-zinc-300 hover:text-zinc-100 border border-[#333]'"
      >
        <component :is="projectStore.audio.isMuted ? VolumeX : Volume2" class="w-3.5 h-3.5" />
        <span>{{ projectStore.audio.isMuted ? 'Muted' : 'Mute All' }}</span>
      </button>
    </div>

    <!-- Volume Sliders -->
    <div class="space-y-4">
      <!-- AI Video Volume -->
      <div class="p-3 rounded-md bg-[#202020] border border-[#2c2c2c] space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium flex items-center gap-1.5">
            <Mic class="w-3.5 h-3.5 text-zinc-500" />
            <span>AI Video Volume (0-10s)</span>
          </span>
          <span class="font-mono text-zinc-200 text-xs font-medium">{{ projectStore.audio.aiVolume }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="projectStore.audio.aiVolume"
          class="w-full"
        />
      </div>

      <!-- User Video Volume -->
      <div class="p-3 rounded-md bg-[#202020] border border-[#2c2c2c] space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium flex items-center gap-1.5">
            <Mic class="w-3.5 h-3.5 text-zinc-500" />
            <span>User Video Volume (10-16s)</span>
          </span>
          <span class="font-mono text-zinc-200 text-xs font-medium">{{ projectStore.audio.userVolume }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="projectStore.audio.userVolume"
          class="w-full"
        />
      </div>

      <!-- Background Music Volume -->
      <div class="p-3 rounded-md bg-[#202020] border border-[#2c2c2c] space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium flex items-center gap-1.5">
            <Music class="w-3.5 h-3.5 text-zinc-500" />
            <span>Background Music Volume</span>
          </span>
          <span class="font-mono text-zinc-200 text-xs font-medium">{{ projectStore.audio.musicVolume }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="projectStore.audio.musicVolume"
          class="w-full"
        />
      </div>
    </div>

    <!-- Background Music Preset Selector -->
    <div class="space-y-2 pt-2 border-t border-[#2c2c2c]">
      <div class="flex items-center justify-between">
        <span class="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
          Soundtrack / BGM
        </span>
        <button
          v-if="projectStore.audio.backgroundMusicName"
          @click="removeMusic"
          class="text-[10px] text-[#c98a8a] hover:underline"
        >
          Remove BGM
        </button>
      </div>

      <div class="space-y-1.5">
        <div
          v-for="item in musicPresets"
          :key="item.id"
          @click="selectMusicPreset(item)"
          class="p-2.5 rounded-md border cursor-pointer transition flex items-center justify-between"
          :class="[
            projectStore.audio.backgroundMusicName === item.name
              ? 'bg-[#2e2e2e] border-[#555] text-zinc-100'
              : 'bg-[#202020] border-[#2c2c2c] text-zinc-500 hover:text-zinc-200 hover:bg-[#262626]'
          ]"
        >
          <div>
            <div class="text-xs font-medium">{{ item.name }}</div>
            <div class="text-[10px] text-zinc-600">{{ item.genre }}</div>
          </div>
          <Check
            v-if="projectStore.audio.backgroundMusicName === item.name"
            class="w-4 h-4 text-zinc-300"
          />
        </div>
      </div>
    </div>
  </div>
</template>
