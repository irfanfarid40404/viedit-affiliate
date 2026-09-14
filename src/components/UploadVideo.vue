<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useVideoStore } from '@/stores/videoStore'
import { useEditorStore } from '@/stores/editorStore'
import { videoService } from '@/services/videoService'
import {
  Upload,
  Film,
  Trash2,
  RefreshCw,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  Play,
  Crop,
  Maximize2,
  Minimize2,
  ChevronRight,
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const videoStore = useVideoStore()
const editorStore = useEditorStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const isLoading = ref(false)
const rawFileDuration = ref(0)
const isTrimmingOpen = ref(false)

const userClip = computed(() => projectStore.userVideo)

async function processFile(file: File) {
  const validation = videoService.validateVideoFile(file)
  if (!validation.valid) {
    editorStore.notify('error', validation.error || 'Invalid video file')
    return
  }

  try {
    isLoading.value = true
    const clip = await videoService.createClipFromFile(file)
    rawFileDuration.value = clip.duration

    projectStore.setUserVideo(clip)

    if (rawFileDuration.value > 6.0) {
      isTrimmingOpen.value = true
      editorStore.notify(
        'warning',
        'Your uploaded video is longer than 6 seconds. Auto-trimmed to first 6s. You can adjust the trim window below.'
      )
    } else {
      editorStore.notify('success', `User video uploaded (${clip.duration.toFixed(1)}s)`)
    }
  } catch (err: any) {
    editorStore.notify('error', err.message || 'Failed to process uploaded video')
  } finally {
    isLoading.value = false
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    processFile(target.files[0])
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    processFile(e.dataTransfer.files[0])
  }
}

function triggerUpload() {
  fileInputRef.value?.click()
}

function handleAutoTrim() {
  projectStore.updateUserTrim(0, 6)
  editorStore.notify('info', 'Trimmed to 00:00 - 00:06')
}

function onTrimStartChange(e: Event) {
  const target = e.target as HTMLInputElement
  const newStart = parseFloat(target.value)
  projectStore.updateUserTrim(newStart, newStart + 6)
}

function handleRemove() {
  projectStore.removeUserVideo()
  editorStore.notify('info', 'User video removed')
}

function handlePreviewUserClip() {
  videoStore.seek(10)
  videoStore.play()
}
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-[#232733]">
      <div class="flex items-center gap-2">
        <Upload class="w-4 h-4 text-blue-400" />
        <h3 class="text-sm font-semibold text-white">Upload Your Video</h3>
      </div>
      <span class="text-[11px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
        00:10 - 00:16 (Max 6s)
      </span>
    </div>

    <!-- Hidden Input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="video/mp4,video/quicktime,video/webm"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Upload Dropzone (if no video) -->
    <div
      v-if="!userClip"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="triggerUpload"
      class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
      :class="[
        isDragging
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-[#292f40] hover:border-blue-500/60 bg-[#141722]/60 hover:bg-[#181c2a]'
      ]"
    >
      <div class="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
        <Upload class="w-6 h-6" />
      </div>

      <div class="space-y-1">
        <div class="text-xs font-semibold text-white">
          Drop your 6-second video here or <span class="text-blue-400 underline">browse</span>
        </div>
        <div class="text-[11px] text-zinc-400">
          Supports MP4, MOV, WebM (Max 250 MB)
        </div>
      </div>

      <div class="text-[10px] text-zinc-500 bg-zinc-800/60 px-2.5 py-1 rounded-full border border-zinc-700/50">
        Required: 6 seconds duration for final 16s merge
      </div>
    </div>

    <!-- Video Uploaded Card & Info -->
    <div v-else class="space-y-4">
      <div class="rounded-xl border border-blue-500/30 bg-gradient-to-b from-[#141a29] to-[#12141c] p-3 space-y-3">
        <!-- Thumbnail and Meta -->
        <div class="flex items-start gap-3">
          <div class="relative w-20 h-24 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-800">
            <img
              v-if="userClip.thumbnailUrl"
              :src="userClip.thumbnailUrl"
              class="w-full h-full object-cover"
            />
            <div class="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-mono text-zinc-300">
              6.0s
            </div>
          </div>

          <div class="flex-1 min-w-0 space-y-1">
            <div class="text-xs font-semibold text-white truncate" :title="userClip.name">
              {{ userClip.name }}
            </div>
            <div class="text-[11px] text-zinc-400 flex items-center gap-2 font-mono">
              <span>Size: {{ userClip.size ? videoService.formatBytes(userClip.size) : 'Ready' }}</span>
              <span>•</span>
              <span class="text-blue-400">Track 2 (10-16s)</span>
            </div>

            <div class="pt-1 flex items-center gap-1.5">
              <button
                @click="handlePreviewUserClip"
                class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium flex items-center gap-1 transition"
              >
                <Play class="w-3 h-3 fill-current" />
                <span>Play Clip</span>
              </button>
              <button
                @click="triggerUpload"
                class="px-2 py-1 bg-[#1e2333] hover:bg-[#282f45] text-zinc-300 rounded text-[11px] font-medium flex items-center gap-1 border border-[#2b334a] transition"
              >
                <RefreshCw class="w-3 h-3" />
                <span>Replace</span>
              </button>
              <button
                @click="projectStore.replaceAIVideoWithUserVideo(); editorStore.notify('success', 'Uploaded video used to replace AI video')"
                class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-medium flex items-center gap-1 transition"
              >
                <Film class="w-3 h-3" />
                <span>Use as AI</span>
              </button>
              <button
                @click="handleRemove"
                class="p-1 text-red-400 hover:bg-red-500/20 rounded transition"
                title="Remove video"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Trimming Section -->
      <div class="p-3 rounded-xl bg-[#141620] border border-[#232733] space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Scissors class="w-3.5 h-3.5 text-blue-400" />
            <span>Trim to 6 Seconds</span>
          </div>
          <button
            @click="handleAutoTrim"
            class="text-[10px] text-blue-400 hover:text-blue-300 underline"
          >
            Reset to 0-6s
          </button>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Start: {{ videoService.formatTime(userClip.trimStart, true) }}</span>
            <span class="text-blue-400 font-semibold">Duration: 00:06.00</span>
            <span>End: {{ videoService.formatTime(userClip.trimEnd, true) }}</span>
          </div>

          <!-- Trimming Slider Window -->
          <div class="space-y-1">
            <input
              type="range"
              :min="0"
              :max="Math.max(0, (userClip.duration || 6) - 6)"
              :step="0.1"
              :value="userClip.trimStart"
              @input="onTrimStartChange"
              class="w-full accent-blue-500"
            />
            <div class="flex justify-between text-[9px] text-zinc-500">
              <span>00:00</span>
              <span>Scroll to shift 6s window</span>
              <span>{{ videoService.formatTime(userClip.duration || 6) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Crop & Framing Section -->
      <div class="p-3 rounded-xl bg-[#141620] border border-[#232733] space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Crop class="w-3.5 h-3.5 text-indigo-400" />
            <span>Crop & Framing</span>
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
            @click="projectStore.updateUserCrop({ mode: 'fit', scale: 1, x: 0, y: 0 })"
            class="py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="[
              (!userClip.crop || userClip.crop.mode === 'fit')
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                : 'bg-[#181b28] border-[#252a3a] text-zinc-400 hover:text-zinc-200'
            ]"
          >
            <Minimize2 class="w-3.5 h-3.5" />
            <span>Fit (Letterbox)</span>
          </button>

          <button
            @click="projectStore.updateUserCrop({ mode: 'fill', scale: 1, x: 0, y: 0 })"
            class="py-2 px-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="[
              userClip.crop?.mode === 'fill'
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
  </div>
</template>
