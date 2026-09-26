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
        <Upload class="w-4 h-4 text-zinc-500" />
        <h3 class="text-sm font-medium text-zinc-100">Upload Your Video</h3>
      </div>
      <span class="text-[11px] font-mono text-zinc-500 bg-[#242424] px-2 py-0.5 rounded border border-[#2c2c2c]">
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
      class="border border-dashed rounded-md p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
      :class="[
        isDragging
          ? 'border-[#e0972f] bg-[#e0972f]/5'
          : 'border-[#3a3a3a] hover:border-[#555] bg-[#1e1e1e] hover:bg-[#242424]'
      ]"
    >
      <div class="w-12 h-12 rounded-full bg-[#262626] border border-[#333] flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition">
        <Upload class="w-6 h-6" />
      </div>

      <div class="space-y-1">
        <div class="text-xs font-medium text-zinc-200">
          Drop your 6-second video here or <span class="text-zinc-400 underline">browse</span>
        </div>
        <div class="text-[11px] text-zinc-500">
          Supports MP4, MOV, WebM (Max 250 MB)
        </div>
      </div>

      <div class="text-[10px] text-zinc-600 bg-[#242424] px-2.5 py-1 rounded-full border border-[#2c2c2c]">
        Required: 6 seconds duration for final 16s merge
      </div>
    </div>

    <!-- Video Uploaded Card & Info -->
    <div v-else class="space-y-4">
      <div class="rounded-md border border-[#2c2c2c] bg-[#202020] p-3 space-y-3">
        <!-- Thumbnail and Meta -->
        <div class="flex items-start gap-3">
          <div class="relative w-20 h-24 rounded-md overflow-hidden bg-black shrink-0 border border-[#2c2c2c]">
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
            <div class="text-xs font-medium text-zinc-100 truncate" :title="userClip.name">
              {{ userClip.name }}
            </div>
            <div class="text-[11px] text-zinc-500 flex items-center gap-2 font-mono">
              <span>Size: {{ userClip.size ? videoService.formatBytes(userClip.size) : 'Ready' }}</span>
              <span>•</span>
              <span>Track 2 (10-16s)</span>
            </div>

            <div class="pt-1 flex items-center gap-1.5">
              <button
                @click="handlePreviewUserClip"
                class="px-2 py-1 bg-[#2e2e2e] hover:bg-[#383838] text-zinc-100 rounded text-[11px] font-medium flex items-center gap-1 transition"
              >
                <Play class="w-3 h-3 fill-current" />
                <span>Play Clip</span>
              </button>
              <button
                @click="triggerUpload"
                class="px-2 py-1 bg-[#262626] hover:bg-[#303030] text-zinc-300 rounded text-[11px] font-medium flex items-center gap-1 border border-[#333] transition"
              >
                <RefreshCw class="w-3 h-3" />
                <span>Replace</span>
              </button>
              <button
                @click="projectStore.replaceAIVideoWithUserVideo(); editorStore.notify('success', 'Uploaded video used to replace AI video')"
                class="px-2 py-1 bg-[#2e2e2e] hover:bg-[#383838] text-zinc-100 rounded text-[11px] font-medium flex items-center gap-1 transition"
              >
                <Film class="w-3 h-3" />
                <span>Use as AI</span>
              </button>
              <button
                @click="handleRemove"
                class="p-1 text-[#c98a8a] hover:bg-[#332424] rounded transition"
                title="Remove video"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Trimming Section -->
      <div class="p-3 rounded-md bg-[#202020] border border-[#2c2c2c] space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Scissors class="w-3.5 h-3.5 text-zinc-500" />
            <span>Trim to 6 Seconds</span>
          </div>
          <button
            @click="handleAutoTrim"
            class="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
          >
            Reset to 0-6s
          </button>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Start: {{ videoService.formatTime(userClip.trimStart, true) }}</span>
            <span class="text-zinc-300 font-medium">Duration: 00:06.00</span>
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
              class="w-full"
            />
            <div class="flex justify-between text-[9px] text-zinc-600">
              <span>00:00</span>
              <span>Scroll to shift 6s window</span>
              <span>{{ videoService.formatTime(userClip.duration || 6) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Crop & Framing Section -->
      <div class="p-3 rounded-md bg-[#202020] border border-[#2c2c2c] space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Crop class="w-3.5 h-3.5 text-zinc-500" />
            <span>Crop & Framing</span>
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
            @click="projectStore.updateUserCrop({ mode: 'fit', scale: 1, x: 0, y: 0 })"
            class="py-2 px-2.5 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="[
              (!userClip.crop || userClip.crop.mode === 'fit')
                ? 'bg-[#2e2e2e] border-[#555] text-zinc-100'
                : 'bg-[#262626] border-[#333] text-zinc-500 hover:text-zinc-300'
            ]"
          >
            <Minimize2 class="w-3.5 h-3.5" />
            <span>Fit (Letterbox)</span>
          </button>

          <button
            @click="projectStore.updateUserCrop({ mode: 'fill', scale: 1, x: 0, y: 0 })"
            class="py-2 px-2.5 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="[
              userClip.crop?.mode === 'fill'
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
  </div>
</template>
