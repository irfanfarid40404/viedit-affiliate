<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  icon: any
  badgeColor?: string
}>()
</script>

<template>
  <div class="flex items-stretch h-12 border-b border-[#242424] bg-[#191919]">
    <!-- Track Header Left (Fixed Width) -->
    <div class="w-36 shrink-0 px-3 flex items-center justify-between border-r border-[#242424] bg-[#1c1c1c]">
      <div class="flex items-center gap-2 min-w-0">
        <component :is="icon" class="w-3.5 h-3.5 shrink-0 text-zinc-500" />
        <span class="text-[11px] font-medium text-zinc-400 truncate">{{ name }}</span>
      </div>
      <span
        v-if="badgeColor"
        class="w-2 h-2 rounded-sm"
        :class="badgeColor"
      ></span>
    </div>

    <!-- Track Body Right (Where clips live) -->
    <div class="flex-1 relative overflow-hidden bg-[#161616]">
      <!-- 10s split line guide -->
      <div
        class="absolute top-0 bottom-0 w-px bg-[#333333] pointer-events-none z-0"
        style="left: 62.5%;"
      ></div>
      <slot />
    </div>
  </div>
</template>
