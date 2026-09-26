<script setup lang="ts">
import { ref } from 'vue'
import type { AspectRatio } from '@/types/video'
import { Sparkles, Dices, RefreshCw } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: string
  aspectRatio: AspectRatio
  quality: 'Standard' | 'High'
  isGenerating: boolean
  maxChars?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:aspectRatio', value: AspectRatio): void
  (e: 'update:quality', value: 'Standard' | 'High'): void
  (e: 'generate'): void
  (e: 'cancel'): void
}>()

const maxChars = props.maxChars || 800

const samplePrompts = [
  'A cinematic shot of a luxury sports car cruising Tokyo neon streets at midnight, rain reflections, smooth tracking camera, 4k photorealistic.',
  'Breathtaking aerial drone footage over misty tropical mountains at golden hour, cinematic lighting, ultra-realistic nature documentary style.',
  'Futuristic cybernetic city with flying vehicles, towering holographic advertisements, neon rain aesthetic, cinematic slow camera pan.',
  'Minimalist modern tech product floating in studio lighting with soft shadows, premium matte texture, elegant 360 degree slow rotation.',
]

function pickRandomSample() {
  const choice = samplePrompts[Math.floor(Math.random() * samplePrompts.length)]
  emit('update:modelValue', choice)
}

function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header with Quick Inspiration -->
    <div class="flex items-center justify-between">
      <label class="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
        <Sparkles class="w-3.5 h-3.5 text-zinc-500" />
        <span>Prompt AI Video (10s)</span>
      </label>
      <button
        type="button"
        @click="pickRandomSample"
        class="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition disabled:opacity-50"
        :disabled="isGenerating"
      >
        <Dices class="w-3.5 h-3.5" />
        <span>Sample Prompt</span>
      </button>
    </div>

    <!-- Textarea with char counter -->
    <div class="relative">
      <textarea
        :value="modelValue"
        @input="handleInput"
        :disabled="isGenerating"
        :maxlength="maxChars"
        rows="4"
        placeholder="Create a cinematic shot of a futuristic city at night, neon lights, slow camera movement, realistic lighting..."
        class="w-full bg-[#242424] border border-[#333] focus:border-[#e0972f] rounded-md p-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none resize-none transition leading-relaxed disabled:opacity-60"
      ></textarea>
      <div class="absolute bottom-2.5 right-3 text-[10px] font-mono text-zinc-500 pointer-events-none">
        {{ modelValue.length }}/{{ maxChars }}
      </div>
    </div>

    <!-- Configuration: Duration, Aspect Ratio, Quality -->
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div>
        <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Duration</label>
        <div class="px-3 py-2 rounded-md bg-[#242424] border border-[#2c2c2c] text-zinc-400 font-medium text-xs flex items-center justify-between">
          <span>Fixed Segment</span>
          <span class="font-mono bg-[#2e2e2e] px-1.5 py-0.5 rounded text-zinc-300">10 sec</span>
        </div>
      </div>

      <div>
        <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Quality</label>
        <div class="flex rounded-md bg-[#242424] border border-[#2c2c2c] p-0.5">
          <button
            type="button"
            @click="emit('update:quality', 'Standard')"
            :disabled="isGenerating"
            class="flex-1 py-1 text-[11px] rounded transition font-medium"
            :class="quality === 'Standard' ? 'bg-[#383838] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
          >
            Standard
          </button>
          <button
            type="button"
            @click="emit('update:quality', 'High')"
            :disabled="isGenerating"
            class="flex-1 py-1 text-[11px] rounded transition font-medium"
            :class="quality === 'High' ? 'bg-[#383838] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'"
          >
            High
          </button>
        </div>
      </div>
    </div>

    <!-- Aspect Ratio Picker -->
    <div>
      <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Aspect Ratio</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          v-for="ar in ['9:16', '16:9', '1:1'] as AspectRatio[]"
          :key="ar"
          @click="emit('update:aspectRatio', ar)"
          :disabled="isGenerating"
          class="py-1.5 text-center text-xs rounded-md border transition font-medium"
          :class="[
            aspectRatio === ar
              ? 'bg-[#2e2e2e] border-[#555] text-zinc-100'
              : 'bg-[#242424] border-[#2c2c2c] text-zinc-500 hover:text-zinc-300'
          ]"
        >
          {{ ar }}
        </button>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="pt-2">
      <button
        v-if="!isGenerating"
        type="button"
        @click="emit('generate')"
        :disabled="!modelValue.trim()"
        class="w-full py-2.5 px-4 bg-[#e0972f] hover:bg-[#eba63f] disabled:bg-[#2a2a2a] disabled:text-zinc-600 disabled:cursor-not-allowed text-[#1a1205] font-semibold text-xs rounded-md flex items-center justify-center gap-2 transition active:scale-[0.98]"
      >
        <Sparkles class="w-4 h-4" />
        <span>Generate 10s AI Video</span>
      </button>

      <button
        v-else
        type="button"
        @click="emit('cancel')"
        class="w-full py-2.5 px-4 bg-[#2e2626] hover:bg-[#3a2c2c] border border-[#4a3333] text-[#d9a8a8] font-semibold text-xs rounded-md flex items-center justify-center gap-2 transition"
      >
        <RefreshCw class="w-4 h-4 animate-spin" />
        <span>Cancel Generation</span>
      </button>
    </div>
  </div>
</template>
