<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import {
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
  <header class="h-12 bg-[#1c1c1c] border-b border-[#2c2c2c] px-4 flex items-center justify-between select-none z-30 shrink-0">
    <!-- Brand / Title -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-[13px] tracking-tight text-zinc-100">Video Affiliate</span>
        <span class="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[#262626] text-zinc-500 border border-[#333]">16s Editor</span>
      </div>
      <input
        v-model="projectStore.name"
        class="bg-transparent text-xs text-zinc-500 hover:text-zinc-300 focus:text-zinc-100 focus:bg-[#262626] rounded px-1.5 py-0.5 -ml-1 border border-transparent focus:border-[#3d3d3d] outline-none max-w-[180px] truncate"
        title="Click to rename project"
      />
    </div>

    <!-- Center: Aspect Ratio & Presets -->
    <div class="hidden md:flex items-center gap-0.5 bg-[#171717] p-0.5 rounded-md border border-[#2c2c2c]">
      <button
        v-for="item in aspectRatios"
        :key="item.value"
        @click="projectStore.aspectRatio = item.value"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition font-medium"
        :class="[
          projectStore.aspectRatio === item.value
            ? 'bg-[#333333] text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-300'
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
        class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-[#2a2a2a] rounded-md border border-[#2c2c2c] transition"
        title="Start fresh project"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span>New</span>
      </button>

      <button
        @click="handleSaveProject"
        class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-[#2a2a2a] rounded-md border border-[#2c2c2c] transition"
        title="Save project configuration"
      >
        <Save class="w-3.5 h-3.5" />
        <span>Save</span>
      </button>

      <button
        @click="openExport"
        class="flex items-center gap-2 px-3.5 py-1.5 bg-[#e0972f] hover:bg-[#eba63f] text-[#1a1205] rounded-md text-xs font-semibold transition active:scale-[0.98]"
      >
        <Download class="w-3.5 h-3.5" />
        <span>Export</span>
      </button>
    </div>
  </header>
</template>
