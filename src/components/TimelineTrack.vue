<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  icon: any
  badgeColor?: string
}>()
</script>

<template>
  <div class="flex items-stretch h-12 border-b border-[#1c202d] bg-[#12141c]">
    <!-- Track Header Left (Fixed Width) -->
    <div class="w-36 shrink-0 px-3 flex items-center justify-between border-r border-[#1c202d] bg-[#151720]">
      <div class="flex items-center gap-2 min-w-0">
        <component :is="icon" class="w-3.5 h-3.5 shrink-0 text-zinc-400" />
        <span class="text-[11px] font-semibold text-zinc-300 truncate">{{ name }}</span>
      </div>
      <span
        v-if="badgeColor"
        class="w-2 h-2 rounded-full"
        :class="badgeColor"
      ></span>
    </div>

    <!-- Track Body Right (Where clips live) -->
    <div class="flex-1 relative overflow-hidden bg-[#0e1017]">
      <!-- 10s split line guide -->
      <div
        class="absolute top-0 bottom-0 w-px bg-zinc-700/40 pointer-events-none z-0"
        style="left: 62.5%;"
      ></div>
      <slot />
    </div>
  </div>
</template>
