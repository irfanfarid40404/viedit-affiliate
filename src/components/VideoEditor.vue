<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore, type EditorTab } from '@/stores/editorStore'
import ProjectToolbar from './ProjectToolbar.vue'
import VideoPreview from './VideoPreview.vue'
import Timeline from './Timeline.vue'
import AIVideoGenerator from './AIVideoGenerator.vue'
import UploadVideo from './UploadVideo.vue'
import FilterPanel from './FilterPanel.vue'
import TextEditor from './TextEditor.vue'
import EffectPanel from './EffectPanel.vue'
import AudioPanel from './AudioPanel.vue'
import TransitionPanel from './TransitionPanel.vue'
import CropPanel from './CropPanel.vue'
import ExportPanel from './ExportPanel.vue'
import {
  Sparkles,
  Upload,
  Crop,
  Type,
  Sliders,
  Wand2,
  Volume2,
  Shuffle,
  Download,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const isSidebarCollapsed = ref(false)

const navTabs: { id: EditorTab; label: string; icon: any; count?: number }[] = [
  { id: 'ai', label: 'AI Generate', icon: Sparkles },
  { id: 'media', label: 'Upload Video', icon: Upload },
  { id: 'crop', label: 'Crop & Scale', icon: Crop },
  { id: 'filters', label: 'Filters', icon: Sliders },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'transition', label: 'Transition', icon: Shuffle },
  { id: 'effects', label: 'Effects', icon: Wand2 },
  { id: 'audio', label: 'Audio', icon: Volume2 },
]
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-[#0b0c10] text-[#e0e2ec] overflow-hidden select-none">
    <!-- Top Project Toolbar -->
    <ProjectToolbar />

    <!-- Main Workspace (Left Sidebar + Center Preview + Right Inspector) -->
    <div class="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
      <!-- LEFT TOOLBAR / SIDEBAR -->
      <div
        class="h-14 md:h-full bg-[#12141c] border-b md:border-b-0 md:border-r border-[#232733] flex md:flex-row shrink-0 z-20 transition-all duration-200"
      >
        <!-- Icon Tab Strip -->
        <div class="flex md:flex-col items-center justify-between md:justify-start w-full md:w-16 py-2 px-1 gap-1 border-r border-[#1e222e] bg-[#101219]">
          <button
            v-for="tab in navTabs"
            :key="tab.id"
            @click="editorStore.setActiveTab(tab.id)"
            class="flex-1 md:flex-none w-full py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-lg text-xs transition"
            :class="[
              editorStore.activeTab === tab.id
                ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            ]"
            :title="tab.label"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            <span class="text-[10px] hidden md:block truncate">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Tab Content Drawer (Collapsible) -->
        <div
          v-show="!isSidebarCollapsed"
          class="hidden md:block w-72 lg:w-80 h-full bg-[#12141c] overflow-y-auto border-r border-[#232733]"
        >
          <AIVideoGenerator v-if="editorStore.activeTab === 'ai'" />
          <UploadVideo v-else-if="editorStore.activeTab === 'media'" />
          <CropPanel v-else-if="editorStore.activeTab === 'crop'" />
          <FilterPanel v-else-if="editorStore.activeTab === 'filters'" />
          <TextEditor v-else-if="editorStore.activeTab === 'text'" />
          <TransitionPanel v-else-if="editorStore.activeTab === 'transition'" />
          <EffectPanel v-else-if="editorStore.activeTab === 'effects'" />
          <AudioPanel v-else-if="editorStore.activeTab === 'audio'" />
        </div>
      </div>

      <!-- CENTER: VIDEO PREVIEW STAGE -->
      <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <VideoPreview />
      </main>

      <!-- RIGHT SIDEBAR (Quick Quick-Inspector / Metadata) -->
      <aside class="hidden xl:flex w-72 h-full bg-[#12141c] border-l border-[#232733] flex-col p-4 space-y-4 overflow-y-auto shrink-0">
        <div class="text-xs uppercase tracking-wider text-zinc-500 font-bold">
          Composition Specs
        </div>

        <div class="space-y-3 text-xs">
          <!-- Total Time & Target Specs -->
          <div class="p-3 rounded-xl bg-[#161824] border border-[#232733] space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-zinc-400">Total Duration</span>
              <span class="font-mono text-indigo-400 font-bold text-sm">16.0s</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-400">AI Video (Veo)</span>
              <span class="font-mono text-emerald-400 font-medium">10.0s (00:00 - 00:10)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-zinc-400">User Video</span>
              <span class="font-mono text-blue-400 font-medium">6.0s (00:10 - 00:16)</span>
            </div>
          </div>

          <!-- Video Tracks Summary -->
          <div class="space-y-2">
            <span class="text-xs font-semibold text-zinc-300">Track 1: AI Prompt</span>
            <div class="p-2.5 rounded-lg bg-[#141620] border border-[#232733] text-[11px] text-zinc-400 line-clamp-3">
              {{ projectStore.aiVideo ? '10s AI clip loaded' : 'No AI video generated yet' }}
            </div>
          </div>

          <div class="space-y-2">
            <span class="text-xs font-semibold text-zinc-300">Track 2: User Video</span>
            <div class="p-2.5 rounded-lg bg-[#141620] border border-[#232733] text-[11px] text-zinc-400 truncate">
              {{ projectStore.userVideo ? `${projectStore.userVideo.name} (Trim: ${projectStore.userVideo.trimStart}s - ${projectStore.userVideo.trimEnd}s)` : 'No user video uploaded yet' }}
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="pt-4 border-t border-[#232733] space-y-2">
            <button
              @click="editorStore.isExportModalOpen = true"
              class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
            >
              <Download class="w-3.5 h-3.5" />
              <span>Export Composition</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Mobile Drawer for Active Tab Content -->
    <div
      v-if="editorStore.activeTab"
      class="block md:hidden max-h-48 bg-[#12141c] border-t border-[#232733] overflow-y-auto"
    >
      <AIVideoGenerator v-if="editorStore.activeTab === 'ai'" />
      <UploadVideo v-else-if="editorStore.activeTab === 'media'" />
      <CropPanel v-else-if="editorStore.activeTab === 'crop'" />
      <FilterPanel v-else-if="editorStore.activeTab === 'filters'" />
      <TextEditor v-else-if="editorStore.activeTab === 'text'" />
      <TransitionPanel v-else-if="editorStore.activeTab === 'transition'" />
      <EffectPanel v-else-if="editorStore.activeTab === 'effects'" />
      <AudioPanel v-else-if="editorStore.activeTab === 'audio'" />
    </div>

    <!-- BOTTOM: 16-SECOND TIMELINE EDITOR -->
    <Timeline />

    <!-- MODALS: Export Dialog -->
    <ExportPanel />

    <!-- TOAST NOTIFICATIONS -->
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
      <div
        v-for="n in editorStore.notifications"
        :key="n.id"
        class="px-3.5 py-2.5 rounded-lg border shadow-xl text-xs flex items-center gap-2 pointer-events-auto transition transform animate-fade-in"
        :class="[
          n.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' :
          n.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' :
          n.type === 'warning' ? 'bg-amber-950/90 border-amber-500/50 text-amber-200' :
          'bg-zinc-900/90 border-zinc-700 text-zinc-200'
        ]"
      >
        <component
          :is="n.type === 'success' ? CheckCircle : n.type === 'error' ? AlertCircle : Info"
          class="w-4 h-4 shrink-0"
        />
        <span class="leading-normal">{{ n.message }}</span>
      </div>
    </div>
  </div>
</template>
