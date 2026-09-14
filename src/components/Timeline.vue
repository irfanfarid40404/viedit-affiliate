<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useVideoStore } from '@/stores/videoStore'
import { useEditorStore } from '@/stores/editorStore'
import TimelineTrack from './TimelineTrack.vue'
import TimelineClip from './TimelineClip.vue'
import { videoService } from '@/services/videoService'
import {
  Sparkles,
  Film,
  Type,
  Wand2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Split,
  Plus,
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const videoStore = useVideoStore()
const editorStore = useEditorStore()

const timelineBodyRef = ref<HTMLDivElement | null>(null)
let isScrubbing = false

// Playhead position (0 to 100%)
const playheadPercent = computed(() => {
  return (videoStore.currentTime / 16) * 100
})

// Time markers for the 16s ruler
const markers = [
  { time: 0, label: '00:00' },
  { time: 2, label: '00:02' },
  { time: 4, label: '00:04' },
  { time: 6, label: '00:06' },
  { time: 8, label: '00:08' },
  { time: 10, label: '00:10 (Split)' },
  { time: 12, label: '00:12' },
  { time: 14, label: '00:14' },
  { time: 16, label: '00:16' },
]

function getEventTime(e: MouseEvent | TouchEvent): number {
  if (!timelineBodyRef.value) return 0
  const rect = timelineBodyRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const relativeX = clientX - rect.left
  const ratio = Math.max(0, Math.min(1, relativeX / rect.width))
  return ratio * 16
}

function onRulerMouseDown(e: MouseEvent) {
  isScrubbing = true
  const t = getEventTime(e)
  videoStore.seek(t)

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isScrubbing) return
  const t = getEventTime(e)
  videoStore.seek(t)
}

function onMouseUp() {
  isScrubbing = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

function selectClip(track: 'ai' | 'user' | 'text', id?: string) {
  if (track === 'ai') {
    editorStore.setActiveTab('ai')
    videoStore.seek(2)
  } else if (track === 'user') {
    editorStore.setActiveTab('media')
    videoStore.seek(11)
  } else if (track === 'text' && id) {
    editorStore.setSelectedTextId(id)
    editorStore.setActiveTab('text')
  }
}
</script>

<template>
  <div class="h-64 bg-[#0d0f15] border-t border-[#232733] flex flex-col select-none shrink-0">
    <!-- Timeline Top Bar -->
    <div class="h-9 px-4 bg-[#12141c] border-b border-[#1f2330] flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-zinc-300 text-xs flex items-center gap-1.5">
          <Split class="w-3.5 h-3.5 text-indigo-400" />
          <span>Timeline (16s Master)</span>
        </span>
        <span class="text-[10px] text-zinc-500 font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded">
          Playhead: {{ videoService.formatTime(videoStore.currentTime, true) }}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Marker Legend -->
        <div class="hidden sm:flex items-center gap-2 text-[10px] font-mono">
          <span class="flex items-center gap-1 text-emerald-400">
            <span class="w-2 h-2 rounded bg-emerald-500"></span> AI (10s)
          </span>
          <span class="flex items-center gap-1 text-blue-400">
            <span class="w-2 h-2 rounded bg-blue-500"></span> User (6s)
          </span>
        </div>

        <!-- Zoom Controls -->
        <div class="flex items-center gap-1 text-zinc-400">
          <button
            @click="editorStore.timelineZoom = Math.max(1, editorStore.timelineZoom - 0.25)"
            class="p-1 hover:text-white rounded"
            title="Zoom Out"
          >
            <ZoomOut class="w-3.5 h-3.5" />
          </button>
          <span class="font-mono text-[10px] text-zinc-400">{{ Math.round(editorStore.timelineZoom * 100) }}%</span>
          <button
            @click="editorStore.timelineZoom = Math.min(2, editorStore.timelineZoom + 0.25)"
            class="p-1 hover:text-white rounded"
            title="Zoom In"
          >
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Timeline Workspace -->
    <div class="flex-1 flex flex-col relative overflow-hidden">
      <!-- Time Ruler Row -->
      <div class="flex items-center h-6 bg-[#151822] border-b border-[#1c202d]">
        <!-- Fixed tracks corner -->
        <div class="w-36 shrink-0 px-3 border-r border-[#1c202d] text-[10px] font-mono text-zinc-500 flex items-center justify-between">
          <span>TRACKS</span>
          <span class="text-zinc-600">16s</span>
        </div>

        <!-- Ruler Body -->
        <div
          ref="timelineBodyRef"
          class="flex-1 relative h-full cursor-pointer overflow-hidden"
          @mousedown="onRulerMouseDown"
        >
          <!-- Ruler Ticks -->
          <div
            v-for="m in markers"
            :key="m.time"
            class="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
            :style="{ left: `${(m.time / 16) * 100}%` }"
          >
            <span
              class="text-[9px] font-mono -translate-x-1/2 pt-0.5 leading-none"
              :class="m.time === 10 ? 'text-indigo-400 font-bold' : 'text-zinc-500'"
            >
              {{ m.label }}
            </span>
            <div
              class="w-px h-1.5 self-center"
              :class="m.time === 10 ? 'bg-indigo-400' : 'bg-zinc-700'"
            ></div>
          </div>
        </div>
      </div>

      <!-- Tracks Container with Interactive Playhead -->
      <div class="flex-1 relative overflow-y-auto overflow-x-hidden">
        <!-- Red/Indigo Playhead Line across all tracks -->
        <div
          class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none transition-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          :style="{ left: `calc(9rem + (100% - 9rem) * ${playheadPercent / 100})` }"
        >
          <div class="w-3 h-3 bg-red-500 rotate-45 -translate-x-1.5 -translate-y-1 shadow"></div>
        </div>

        <!-- TRACK 1: AI VIDEO (00:00 - 00:10) -->
        <TimelineTrack name="TRACK 1: AI VIDEO" :icon="Sparkles" badgeColor="bg-emerald-500">
          <TimelineClip
            v-if="projectStore.aiVideo"
            title="Veo AI Generated Clip"
            subtitle="10.0s [00:00 - 00:10]"
            :startTime="0"
            :duration="10"
            colorClass="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white"
            :isActive="videoStore.activeSegment === 'ai'"
            @click="selectClip('ai')"
          />
          <div
            v-else
            @click="editorStore.setActiveTab('ai')"
            class="absolute left-0 top-1 bottom-1 w-[62.5%] rounded border border-dashed border-emerald-500/40 bg-emerald-950/20 text-emerald-400/80 text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer hover:bg-emerald-950/40 transition"
          >
            <Plus class="w-3 h-3" />
            <span>Generate 10s AI Video</span>
          </div>
        </TimelineTrack>

        <!-- TRACK 2: USER VIDEO (00:10 - 00:16) -->
        <TimelineTrack name="TRACK 2: USER VIDEO" :icon="Film" badgeColor="bg-blue-500">
          <TimelineClip
            v-if="projectStore.userVideo"
            :title="projectStore.userVideo.name"
            subtitle="6.0s [00:10 - 00:16]"
            :startTime="10"
            :duration="6"
            colorClass="bg-gradient-to-r from-blue-700 to-blue-600 text-white"
            :isActive="videoStore.activeSegment === 'user'"
            @click="selectClip('user')"
          />
          <div
            v-else
            @click="editorStore.setActiveTab('media')"
            class="absolute left-[62.5%] top-1 bottom-1 w-[37.5%] rounded border border-dashed border-blue-500/40 bg-blue-950/20 text-blue-400/80 text-[11px] font-medium flex items-center justify-center gap-1 cursor-pointer hover:bg-blue-950/40 transition"
          >
            <Plus class="w-3 h-3" />
            <span>Upload 6s Video</span>
          </div>
        </TimelineTrack>

        <!-- TRACK 3: TEXT -->
        <TimelineTrack name="TRACK 3: TEXT" :icon="Type" badgeColor="bg-amber-500">
          <TimelineClip
            v-for="textItem in projectStore.texts"
            :key="textItem.id"
            :title="textItem.text || 'Text Layer'"
            :subtitle="`${textItem.startTime}s - ${textItem.endTime}s`"
            :startTime="textItem.startTime"
            :duration="textItem.endTime - textItem.startTime"
            colorClass="bg-gradient-to-r from-amber-600 to-amber-500 text-black font-semibold"
            :isActive="editorStore.selectedTextId === textItem.id"
            @click="selectClip('text', textItem.id)"
          />
        </TimelineTrack>

        <!-- TRACK 4: EFFECT -->
        <TimelineTrack name="TRACK 4: EFFECT" :icon="Wand2" badgeColor="bg-purple-500">
          <TimelineClip
            title="Cinematic Filters & Particle Overlay"
            subtitle="Applied on Klip 1 (00:00 - 00:10)"
            :startTime="0"
            :duration="10"
            colorClass="bg-gradient-to-r from-purple-800 to-indigo-800 text-white"
            @click="editorStore.setActiveTab('filters')"
          />
        </TimelineTrack>
      </div>
    </div>
  </div>
</template>
