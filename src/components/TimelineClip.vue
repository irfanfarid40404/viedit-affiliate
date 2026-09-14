<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  subtitle?: string
  startTime: number // 0 to 16
  duration: number  // in seconds
  colorClass: string
  isActive?: boolean
  totalDuration?: number
}>()

const totalDur = props.totalDuration || 16

const styleObject = computed(() => {
  const leftPercent = (props.startTime / totalDur) * 100
  const widthPercent = (props.duration / totalDur) * 100
  return {
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
  }
})
</script>

<template>
  <div
    class="absolute top-1 bottom-1 rounded-md px-2 py-1 flex flex-col justify-center select-none cursor-pointer transition-all border shadow-sm group"
    :class="[
      colorClass,
      isActive ? 'ring-2 ring-white border-white' : 'border-black/20 hover:brightness-110'
    ]"
    :style="styleObject"
  >
    <div class="flex items-center justify-between text-[11px] font-bold truncate leading-tight">
      <span class="truncate">{{ title }}</span>
      <span class="text-[9px] font-mono opacity-80 shrink-0 ml-1">{{ duration.toFixed(1) }}s</span>
    </div>
    <div v-if="subtitle" class="text-[9px] opacity-75 truncate leading-tight font-mono">
      {{ subtitle }}
    </div>
  </div>
</template>
