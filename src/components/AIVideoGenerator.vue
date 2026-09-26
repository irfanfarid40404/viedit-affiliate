<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useVideoStore } from '@/stores/videoStore'
import { useEditorStore } from '@/stores/editorStore'
import { useAIGenerationStore } from '@/stores/aiGenerationStore'
import PromptInput from './PromptInput.vue'
import type { VideoClip } from '@/types/video'
import {
  Sparkles,
  Play,
  RotateCcw,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Film,
  Crop,
  Maximize2,
  Minimize2,
  ChevronRight,
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const videoStore = useVideoStore()
const editorStore = useEditorStore()
const genStore = useAIGenerationStore()

const prompt = ref(
  'A cinematic shot of a luxury sports car cruising through futuristic Tokyo at night, neon reflections on wet asphalt, smooth tracking camera.'
)
const quality = ref<'Standard' | 'High'>('Standard')

// Re-exposed from the generation store so the UI reacts globally
const isGenerating = computed(() => genStore.isGenerating)
const generationStatus = computed(() => genStore.status)
const statusMessage = computed(() => genStore.statusMessage)
const progressPercent = computed(() => genStore.progress)
const engineLabel = ref('')

function handleGenerate() {
  if (!prompt.value.trim()) {
    editorStore.notify('warning', 'Prompt cannot be empty')
    return
  }

  genStore.start(
    prompt.value,
    { aspectRatio: projectStore.aspectRatio, quality: quality.value },
    applyGeneratedClip,
    (message) => { engineLabel.value = '' },
    (type, msg) => editorStore.notify(type, msg)
  )
}

function applyGeneratedClip(url: string) {
  const clip: VideoClip = {
    id: 'ai-clip-' + Date.now(),
    name: 'AI 10s Clip',
    url,
    duration: 10,
    startTime: 0,
    trimStart: 0,
    trimEnd: 10,
  }

  projectStore.setAIVideo(clip)
  videoStore.seek(0)
  editorStore.notify('success', '10-second AI Video added to timeline (00:00 - 00:10)')
}

// Resume an interrupted generation after a page refresh
onMounted(() => {
  genStore.tryResume(
    applyGeneratedClip,
    () => {},
    (type, msg) => editorStore.notify(type, msg)
  )
})

function handleCancel() {
  genStore.cancel()
  editorStore.notify('info', 'AI generation cancelled')
}

function handleRegenerate() {
  // Keeps the current prompt ready to edit or resubmit
  handleGenerate()
}

function handlePreviewClip() {
  videoStore.seek(0)
  videoStore.play()
}

function handleDownloadAIClip() {
  if (!projectStore.aiVideo?.url) return
  const a = document.createElement('a')
  a.href = projectStore.aiVideo.url
  a.download = 'ai-video-10s.mp4'
  a.click()
  editorStore.notify('info', 'Downloading AI Video...')
}

function handleDeleteAIClip() {
  projectStore.removeAIVideo()
  editorStore.notify('info', 'AI Video removed from project')
}
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Section Title -->
    <div class="flex items-center justify-between pb-2 border-b border-[#2c2c2c]">
      <div class="flex items-center gap-2">
        <Sparkles class="w-4 h-4 text-zinc-500" />
        <h3 class="text-sm font-medium text-zinc-100">AI Video Generator</h3>
      </div>
      <span class="text-[11px] font-mono text-zinc-500 bg-[#242424] px-2 py-0.5 rounded border border-[#2c2c2c]">
        00:00 - 00:10
      </span>
    </div>

    <!-- Active AI Video Result Preview Card -->
    <div
      v-if="projectStore.aiVideo"
      class="rounded-md border border-[#2c2c2c] bg-[#202020] p-3 space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Film class="w-4 h-4 text-zinc-400" />
          <div>
            <div class="text-xs font-medium text-zinc-100">AI Video Ready</div>
            <div class="text-[11px] text-zinc-500 font-mono">Duration: 10.0s (Track 1)</div>
          </div>
        </div>
        <span class="text-[10px] uppercase font-medium px-2 py-0.5 rounded bg-[#2a2a2a] text-zinc-400 border border-[#333]">
          Active
        </span>
      </div>

      <!-- Quick Actions for existing clip -->
      <div class="grid grid-cols-2 gap-2 pt-1">
        <button
          @click="handlePreviewClip"
          class="py-1.5 px-2 bg-[#2e2e2e] hover:bg-[#383838] text-zinc-100 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition"
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>Play (0-10s)</span>
        </button>

        <button
          @click="projectStore.replaceUserVideoWithAIVideo(); editorStore.notify('success', 'AI video used to replace uploaded video')"
          class="py-1.5 px-2 bg-[#2e2e2e] hover:bg-[#383838] text-zinc-100 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>Use as upload</span>
        </button>

        <button
          @click="handleRegenerate"
          :disabled="isGenerating"
          class="py-1.5 px-2 bg-[#262626] hover:bg-[#303030] text-zinc-300 rounded text-xs font-medium flex items-center justify-center gap-1.5 border border-[#333] transition disabled:opacity-50"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Regenerate</span>
        </button>

        <button
          @click="handleDownloadAIClip"
          class="py-1.5 px-2 bg-[#262626] hover:bg-[#303030] text-zinc-300 rounded text-xs font-medium flex items-center justify-center gap-1.5 border border-[#333] transition"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Download</span>
        </button>

        <button
          @click="handleDeleteAIClip"
          class="py-1.5 px-2 bg-[#262626] hover:bg-[#382626] text-[#c98a8a] rounded text-xs font-medium flex items-center justify-center gap-1.5 border border-[#333] transition"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Delete Clip</span>
        </button>
      </div>

      <!-- Quick Crop & Framing for AI Video -->
      <div class="pt-2 border-t border-[#2c2c2c] space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Crop class="w-3.5 h-3.5 text-zinc-500" />
            <span>AI Video Crop & Framing</span>
          </div>
          <button
            @click="editorStore.setActiveTab('crop')"
            class="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
          >
            <span>Advanced Crop</span>
            <ChevronRight class="w-3 h-3" />
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            @click="projectStore.updateAICrop({ mode: 'fit', scale: 1, x: 0, y: 0 })"
            class="py-1.5 px-2 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="[
              (!projectStore.aiVideo.crop || projectStore.aiVideo.crop.mode === 'fit')
                ? 'bg-[#2e2e2e] border-[#555] text-zinc-100'
                : 'bg-[#262626] border-[#333] text-zinc-500 hover:text-zinc-300'
            ]"
          >
            <Minimize2 class="w-3.5 h-3.5" />
            <span>Fit (Letterbox)</span>
          </button>

          <button
            @click="projectStore.updateAICrop({ mode: 'fill', scale: 1, x: 0, y: 0 })"
            class="py-1.5 px-2 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="[
              projectStore.aiVideo.crop?.mode === 'fill'
                ? 'bg-[#2e2e2e] border-[#555] text-zinc-100'
                : 'bg-[#262626] border-[#333] text-zinc-500 hover:text-zinc-300'
            ]"
          >
            <Maximize2 class="w-3.5 h-3.5" />
            <span>Fill (Full Screen)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Generation Status Banner -->
    <div
      v-if="isGenerating || generationStatus === 'Failed'"
      class="p-3 rounded-md border text-xs space-y-2 transition-all"
      :class="[
        generationStatus === 'Failed'
          ? 'bg-[#2a1e1e] border-[#4a3333] text-[#d9a8a8]'
          : 'bg-[#242424] border-[#3a3a3a] text-zinc-300'
      ]"
    >
      <div class="flex items-center gap-2">
        <component
          :is="generationStatus === 'Failed' ? AlertCircle : Sparkles"
          class="w-4 h-4 shrink-0"
          :class="isGenerating ? 'animate-pulse text-zinc-400' : 'text-[#c98a8a]'"
        />
        <span class="font-medium uppercase text-[11px] tracking-wider flex-1">
          Status: {{ generationStatus }}
        </span>
        <span v-if="isGenerating" class="font-mono text-[11px] text-zinc-400">{{ progressPercent }}%</span>
      </div>

      <!-- Progress bar (indeterminate sweep while preparing) -->
      <div v-if="isGenerating" class="h-1 w-full bg-[#2e2e2e] rounded-full overflow-hidden">
        <div
          v-if="progressPercent > 5"
          class="h-full bg-[#e0972f] transition-all duration-500 rounded-full"
          :style="{ width: `${progressPercent}%` }"
        ></div>
        <div v-else class="h-full w-1/3 bg-[#e0972f] rounded-full animate-[sweep_1.2s_ease-in-out_infinite]"></div>
      </div>

      <p class="text-[11px] text-zinc-500 leading-normal">
        {{ statusMessage }}
      </p>
      <p v-if="isGenerating" class="text-[10px] text-zinc-600 leading-normal">
        You can keep editing other panels — generation continues in the background. Typical time: 30-90 seconds.
      </p>
    </div>

    <!-- Prompt & Generator Input -->
    <PromptInput
      v-model="prompt"
      :aspectRatio="projectStore.aspectRatio"
      :quality="quality"
      :isGenerating="isGenerating"
      @update:aspectRatio="projectStore.aspectRatio = $event"
      @update:quality="quality = $event"
      @generate="handleGenerate"
      @cancel="handleCancel"
    />
  </div>
</template>
