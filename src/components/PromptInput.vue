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
      <label class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
        <Sparkles class="w-3.5 h-3.5 text-indigo-400" />
        <span>Prompt AI Video (10s)</span>
      </label>
      <button
        type="button"
        @click="pickRandomSample"
        class="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition disabled:opacity-50"
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
        class="w-full bg-[#161822] border border-[#272d3e] focus:border-indigo-500 rounded-lg p-3 text-xs text-white placeholder-zinc-500 outline-none resize-none transition leading-relaxed disabled:opacity-60"
      ></textarea>
      <div class="absolute bottom-2.5 right-3 text-[10px] font-mono text-zinc-500 pointer-events-none">
        {{ modelValue.length }}/{{ maxChars }}
      </div>
    </div>

    <!-- Configuration: Duration, Aspect Ratio, Quality -->
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div>
        <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Duration</label>
        <div class="px-3 py-2 rounded-md bg-[#161822] border border-[#232733] text-indigo-400 font-semibold text-xs flex items-center justify-between">
          <span>Fixed Segment</span>
          <span class="font-mono bg-indigo-500/20 px-1.5 py-0.5 rounded text-indigo-300">10 sec</span>
        </div>
      </div>

      <div>
        <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Quality</label>
        <div class="flex rounded-md bg-[#161822] border border-[#232733] p-0.5">
          <button
            type="button"
            @click="emit('update:quality', 'Standard')"
            :disabled="isGenerating"
            class="flex-1 py-1 text-[11px] rounded transition font-medium"
            :class="quality === 'Standard' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'"
          >
            Standard
          </button>
          <button
            type="button"
            @click="emit('update:quality', 'High')"
            :disabled="isGenerating"
            class="flex-1 py-1 text-[11px] rounded transition font-medium"
            :class="quality === 'High' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'"
          >
            High
          </button>
        </div>
      </div>
    </div>

    <!-- Aspect Ratio Picker -->
    <div>
      <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Aspect Ratio</label>
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
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
              : 'bg-[#161822] border-[#252a3a] text-zinc-400 hover:text-zinc-200'
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
        class="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition transform active:scale-98"
      >
        <Sparkles class="w-4 h-4" />
        <span>Generate 10s AI Video</span>
      </button>

      <button
        v-else
        type="button"
        @click="emit('cancel')"
        class="w-full py-2.5 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition"
      >
        <RefreshCw class="w-4 h-4 animate-spin" />
        <span>Cancel Generation</span>
      </button>
    </div>
  </div>
</template>
