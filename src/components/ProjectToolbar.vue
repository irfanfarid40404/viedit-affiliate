<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import {
  Sparkles,
  Download,
  FolderOpen,
  Save,
  Monitor,
  Smartphone,
  Square,
  RotateCcw,
} from 'lucide-vue-next'
import type { AspectRatio } from '@/types/video'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const aspectRatios: { label: string; value: AspectRatio; icon: any }[] = [
  { label: '9:16 (TikTok/Reels)', value: '9:16', icon: Smartphone },
  { label: '16:9 (YouTube)', value: '16:9', icon: Monitor },
  { label: '1:1 (Square)', value: '1:1', icon: Square },
]

function handleNewProject() {
  if (confirm('Start new project? Current timeline will be reset.')) {
    projectStore.removeAIVideo()
    projectStore.removeUserVideo()
    projectStore.texts = []
    projectStore.applyDefaultPreset()
    editorStore.notify('info', 'Started new blank project')
  }
}

function handleSaveProject() {
  const exportData = projectStore.getProjectExport()
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2))
  const dlAnchor = document.createElement('a')
  dlAnchor.setAttribute('href', dataStr)
  dlAnchor.setAttribute('download', `${projectStore.name.replace(/\s+/g, '_')}_project.json`)
  dlAnchor.click()
  editorStore.notify('success', 'Project JSON exported successfully')
}

function openExport() {
  editorStore.isExportModalOpen = true
}
</script>

<template>
  <header class="h-14 bg-[#12141a] border-b border-[#232733] px-4 flex items-center justify-between select-none z-30 shrink-0">
    <!-- Brand / Title -->
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
        <Sparkles class="w-4 h-4 text-white" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm tracking-wide text-white">AI Video Generator</span>
          <span class="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Pro 16s</span>
        </div>
        <input
          v-model="projectStore.name"
          class="bg-transparent text-xs text-zinc-400 hover:text-zinc-200 focus:text-white focus:bg-zinc-800/60 rounded px-1 -ml-1 border-none outline-none max-w-[180px] truncate"
          title="Click to rename project"
        />
      </div>
    </div>

    <!-- Center: Aspect Ratio & Presets -->
    <div class="hidden md:flex items-center gap-1 bg-[#171a22] p-1 rounded-lg border border-[#232733]">
      <button
        v-for="item in aspectRatios"
        :key="item.value"
        @click="projectStore.aspectRatio = item.value"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition font-medium"
        :class="[
          projectStore.aspectRatio === item.value
            ? 'bg-indigo-600 text-white shadow'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
        ]"
      >
        <component :is="item.icon" class="w-3.5 h-3.5" />
        <span>{{ item.value }}</span>
      </button>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2">
      <button
        @click="handleNewProject"
        class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md border border-[#2b3040] transition"
        title="Start fresh project"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>New</span>
      </button>

      <button
        @click="handleSaveProject"
        class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md border border-[#2b3040] transition"
        title="Save project configuration"
      >
        <Save class="w-3.5 h-3.5" />
        <span>Save</span>
      </button>

      <button
        @click="openExport"
        class="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-md text-xs font-semibold shadow-md shadow-indigo-600/30 transition transform active:scale-95"
      >
        <Download class="w-3.5 h-3.5" />
        <span>Export Video</span>
      </button>
    </div>
  </header>
</template>
