<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useVideoStore } from '@/stores/videoStore'
import { useEditorStore } from '@/stores/editorStore'
import { geminiService } from '@/services/geminiService'
import PromptInput from './PromptInput.vue'
import type { AspectRatio, VideoClip, VideoGenerationStatus } from '@/types/video'
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

const prompt = ref(
  'A cinematic shot of a luxury sports car cruising through futuristic Tokyo at night, neon reflections on wet asphalt, smooth tracking camera.'
)
const quality = ref<'Standard' | 'High'>('Standard')
const isGenerating = ref(false)
const generationStatus = ref<VideoGenerationStatus>('idle')
const statusMessage = ref('')
let activePollTimer: number | null = null

async function handleGenerate() {
  if (!prompt.value.trim()) {
    editorStore.notify('warning', 'Prompt cannot be empty')
    return
  }

  try {
    isGenerating.value = true
    generationStatus.value = 'Preparing'
    statusMessage.value = 'Initializing AI video pipeline...'

    const response = await geminiService.generateVideo(prompt.value, {
      duration: 10,
      aspectRatio: projectStore.aspectRatio,
      quality: quality.value,
    })

    if (response.videoUrl) {
      // Direct completion
      applyGeneratedClip(response.videoUrl)
      return
    }

    if (response.operationId) {
      pollOperation(response.operationId)
    } else {
      throw new Error('No operation ID or video URL returned')
    }
  } catch (err: any) {
    generationStatus.value = 'Failed'
    statusMessage.value = err.message || 'Video generation failed. Please try again.'
    isGenerating.value = false
    editorStore.notify('error', statusMessage.value)
  }
}

function pollOperation(operationId: string) {
  let attempts = 0
  const maxAttempts = 60 // ~2-3 minutes max

  activePollTimer = window.setInterval(async () => {
    attempts++
    try {
      const statusRes = await geminiService.getGenerationStatus(operationId)
      const rawStatus = (statusRes.status || '').toLowerCase()
      generationStatus.value = statusRes.status || 'Processing'

      if (rawStatus === 'preparing' || rawStatus === 'queued') {
        statusMessage.value = 'Preparing scene assets & prompt embeddings...'
      } else if (rawStatus === 'generating') {
        statusMessage.value = 'Generating video frames (Google Veo engine)...'
      } else if (rawStatus === 'processing') {
        statusMessage.value = 'Encoding 10-second MP4 render...'
      } else if (rawStatus === 'completed' && statusRes.videoUrl) {
        clearInterval(activePollTimer!)
        activePollTimer = null
        applyGeneratedClip(statusRes.videoUrl)
      } else if (rawStatus === 'failed') {
        clearInterval(activePollTimer!)
        activePollTimer = null
        generationStatus.value = 'Failed'
        statusMessage.value = statusRes.error || 'Video generation failed. Please try again.'
        isGenerating.value = false
        editorStore.notify('error', statusMessage.value)
      }

      if (attempts >= maxAttempts) {
        clearInterval(activePollTimer!)
        activePollTimer = null
        generationStatus.value = 'Failed'
        statusMessage.value = 'AI generation request timed out.'
        isGenerating.value = false
        editorStore.notify('error', statusMessage.value)
      }
    } catch (err: any) {
      clearInterval(activePollTimer!)
      activePollTimer = null
      generationStatus.value = 'Failed'
      statusMessage.value = err.message || 'Unable to retrieve generation status.'
      isGenerating.value = false
      editorStore.notify('error', statusMessage.value)
    }
  }, 2500)
}

function handleCancel() {
  if (activePollTimer) {
    clearInterval(activePollTimer)
    activePollTimer = null
  }
  isGenerating.value = false
  generationStatus.value = 'idle'
  statusMessage.value = 'Generation cancelled.'
  editorStore.notify('info', 'AI generation cancelled')
}

function applyGeneratedClip(url: string) {
  isGenerating.value = false
  generationStatus.value = 'Completed'
  statusMessage.value = '10s AI Video generated successfully!'

  const clip: VideoClip = {
    id: 'ai-clip-' + Date.now(),
    name: 'AI Veo 10s Clip',
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
  generationStatus.value = 'idle'
  editorStore.notify('info', 'AI Video removed from project')
}
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Section Title -->
    <div class="flex items-center justify-between pb-2 border-b border-[#232733]">
      <div class="flex items-center gap-2">
        <Sparkles class="w-4 h-4 text-indigo-400" />
        <h3 class="text-sm font-semibold text-white">Google Veo AI Generator</h3>
      </div>
      <span class="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
        00:00 - 00:10
      </span>
    </div>

    <!-- Active AI Video Result Preview Card -->
    <div
      v-if="projectStore.aiVideo"
      class="rounded-xl border border-indigo-500/40 bg-gradient-to-b from-[#161a26] to-[#12141c] p-3 space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Film class="w-4 h-4 text-emerald-400" />
          <div>
            <div class="text-xs font-semibold text-white">AI Video Ready</div>
            <div class="text-[11px] text-emerald-400 font-mono">Duration: 10.0s (Track 1)</div>
          </div>
        </div>
        <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Active
        </span>
      </div>

      <!-- Quick Actions for existing clip -->
      <div class="grid grid-cols-2 gap-2 pt-1">
        <button
          @click="handlePreviewClip"
          class="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition"
        >
          <Play class="w-3.5 h-3.5 fill-current" />
          <span>Play (0-10s)</span>
        </button>

        <button
          @click="projectStore.replaceUserVideoWithAIVideo(); editorStore.notify('success', 'AI video used to replace uploaded video')"
          class="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 transition"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>Use as upload</span>
        </button>

        <button
          @click="handleRegenerate"
          :disabled="isGenerating"
          class="py-1.5 px-2 bg-[#1f2433] hover:bg-[#2a3045] text-zinc-300 hover:text-white rounded text-xs font-medium flex items-center justify-center gap-1.5 border border-[#2e354a] transition disabled:opacity-50"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          <span>Regenerate</span>
        </button>

        <button
          @click="handleDownloadAIClip"
          class="py-1.5 px-2 bg-[#181a24] hover:bg-[#202434] text-zinc-400 hover:text-zinc-200 rounded text-xs font-medium flex items-center justify-center gap-1.5 border border-[#282d3d] transition"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Download</span>
        </button>

        <button
          @click="handleDeleteAIClip"
          class="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs font-medium flex items-center justify-center gap-1.5 border border-red-500/30 transition"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Delete Clip</span>
        </button>
      </div>

      <!-- Quick Crop & Framing for AI Video -->
      <div class="pt-2 border-t border-[#232733] space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Crop class="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Video Crop & Framing</span>
          </div>
          <button
            @click="editorStore.setActiveTab('crop')"
            class="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
          >
            <span>Advanced Crop</span>
            <ChevronRight class="w-3 h-3" />
          </button>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            @click="projectStore.updateAICrop({ mode: 'fit', scale: 1, x: 0, y: 0 })"
            class="py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="[
              (!projectStore.aiVideo.crop || projectStore.aiVideo.crop.mode === 'fit')
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                : 'bg-[#181b28] border-[#252a3a] text-zinc-400 hover:text-zinc-200'
            ]"
          >
            <Minimize2 class="w-3.5 h-3.5" />
            <span>Fit (Letterbox)</span>
          </button>

          <button
            @click="projectStore.updateAICrop({ mode: 'fill', scale: 1, x: 0, y: 0 })"
            class="py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="[
              projectStore.aiVideo.crop?.mode === 'fill'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                : 'bg-[#181b28] border-[#252a3a] text-zinc-400 hover:text-zinc-200'
            ]"
          >
            <Maximize2 class="w-3.5 h-3.5" />
            <span>Fill (Full Screen)</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Generation Status Banner (Real Progress, No Fake Percentages) -->
    <div
      v-if="isGenerating || generationStatus === 'Failed'"
      class="p-3 rounded-lg border text-xs space-y-1.5 transition-all"
      :class="[
        generationStatus === 'Failed'
          ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200'
      ]"
    >
      <div class="flex items-center gap-2">
        <component
          :is="generationStatus === 'Failed' ? AlertCircle : Sparkles"
          class="w-4 h-4 shrink-0"
          :class="isGenerating ? 'animate-pulse text-indigo-400' : 'text-red-400'"
        />
        <span class="font-semibold uppercase text-[11px] tracking-wider">
          Status: {{ generationStatus }}
        </span>
      </div>
      <p class="text-[11px] text-zinc-300 leading-normal pl-6">
        {{ statusMessage }}
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
