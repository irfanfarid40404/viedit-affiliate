<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import { ffmpegService, type ExportProgressEvent } from '@/services/ffmpegService'
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Film,
  Sparkles,
  Loader2,
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const isExporting = ref(false)
const progress = ref<ExportProgressEvent>({
  phase: 'Preparing',
  percent: 0,
  message: '',
})
const downloadUrl = ref<string | null>(null)
const exportError = ref<string | null>(null)

const resolutionText = computed(() => {
  switch (projectStore.aspectRatio) {
    case '9:16':
      return '1080 x 1920 (Vertical HD)'
    case '16:9':
      return '1920 x 1080 (Full HD)'
    case '1:1':
      return '1080 x 1080 (Square)'
  }
})

// Validation
const validationIssues = computed(() => {
  const issues: string[] = []
  if (!projectStore.aiVideo && !projectStore.userVideo) {
    issues.push('Timeline is empty. Please generate an AI video or upload a video clip first.')
  }
  return issues
})

async function startExport() {
  if (validationIssues.value.length > 0) {
    editorStore.notify('error', validationIssues.value[0])
    return
  }

  isExporting.value = true
  exportError.value = null
  downloadUrl.value = null

  const projectData = projectStore.getProjectExport()

  const result = await ffmpegService.exportVideo(projectData, (evt) => {
    progress.value = evt
  })

  isExporting.value = false

  if (result.success && result.downloadUrl) {
    downloadUrl.value = result.downloadUrl
    editorStore.notify('success', '16s Video render complete! Ready to download.')
  } else {
    exportError.value = result.error || 'Failed to export video composition'
    editorStore.notify('error', exportError.value)
  }
}

function close() {
  if (isExporting.value) return
  editorStore.isExportModalOpen = false
  downloadUrl.value = null
  exportError.value = null
}
</script>

<template>
  <div
    v-if="editorStore.isExportModalOpen"
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    @click.self="close"
  >
    <div class="w-full max-w-lg bg-[#12151f] border border-[#272d3e] rounded-2xl shadow-2xl p-6 space-y-5">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-[#232733] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Download class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Export Final 16s Video</h3>
            <p class="text-[11px] text-zinc-400">Combine 10s AI Video + 6s User Video + Realtime Filters</p>
          </div>
        </div>
        <button
          @click="close"
          :disabled="isExporting"
          class="text-zinc-500 hover:text-white p-1 rounded transition disabled:opacity-30"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Specification Overview -->
      <div class="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#161824] border border-[#232733] text-xs">
        <div>
          <span class="text-[10px] text-zinc-500 block uppercase font-medium">Duration</span>
          <span class="font-mono font-bold text-indigo-400 text-sm">16.00s</span>
        </div>
        <div>
          <span class="text-[10px] text-zinc-500 block uppercase font-medium">Format</span>
          <span class="font-mono font-bold text-white text-sm">MP4 (H.264)</span>
        </div>
        <div>
          <span class="text-[10px] text-zinc-500 block uppercase font-medium">Resolution</span>
          <span class="font-mono font-bold text-white text-sm">{{ resolutionText }}</span>
        </div>
      </div>

      <!-- Validation Warnings if incomplete -->
      <div
        v-if="validationIssues.length > 0 && !downloadUrl && !isExporting"
        class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5"
      >
        <div class="font-semibold flex items-center gap-1.5">
          <AlertCircle class="w-4 h-4 text-amber-400 shrink-0" />
          <span>Timeline Incomplete</span>
        </div>
        <ul class="list-disc list-inside text-[11px] text-amber-300/90 pl-1 space-y-0.5">
          <li v-for="(issue, idx) in validationIssues" :key="idx">{{ issue }}</li>
        </ul>
      </div>

      <!-- Progress Section During Export -->
      <div v-if="isExporting" class="p-4 rounded-xl bg-[#161824] border border-[#232733] space-y-3">
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-white flex items-center gap-2">
            <Loader2 class="w-4 h-4 animate-spin text-indigo-400" />
            <span>{{ progress.phase }}...</span>
          </span>
          <span class="font-mono text-indigo-400 font-bold">{{ progress.percent }}%</span>
        </div>

        <!-- Progress Bar -->
        <div class="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
            :style="{ width: `${progress.percent}%` }"
          ></div>
        </div>

        <p class="text-[11px] text-zinc-400 text-center font-mono">
          {{ progress.message }}
        </p>
      </div>

      <!-- Finished Success Section -->
      <div
        v-if="downloadUrl"
        class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3"
      >
        <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
          <CheckCircle2 class="w-6 h-6" />
        </div>
        <div>
          <h4 class="text-sm font-bold text-white">Rendering Complete!</h4>
          <p class="text-xs text-zinc-300">Your 16-second final composition is ready.</p>
        </div>

        <a
          :href="downloadUrl"
          download="final-video-16s.mp4"
          class="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-emerald-600/30 transition transform active:scale-98"
        >
          <Download class="w-4 h-4" />
          <span>Download Video (final-video.mp4)</span>
        </a>
      </div>

      <!-- Error message -->
      <div
        v-if="exportError"
        class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2"
      >
        <AlertCircle class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <span>{{ exportError }}</span>
      </div>

      <!-- Action Button Footer -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#232733]">
        <button
          @click="close"
          :disabled="isExporting"
          class="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 transition disabled:opacity-40"
        >
          Close
        </button>

        <button
          v-if="!downloadUrl"
          @click="startExport"
          :disabled="isExporting || validationIssues.length > 0"
          class="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>{{ isExporting ? 'Exporting...' : 'Render Composition' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
