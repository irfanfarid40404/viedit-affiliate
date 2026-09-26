<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: number
    min?: number
    max?: number
    step?: number
    defaultValue?: number
    unit?: string
  }>(),
  {
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: '',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', parseFloat(target.value))
}

function reset() {
  emit('update:modelValue', props.defaultValue)
}

const isChanged = computed(() => props.modelValue !== props.defaultValue)
</script>

<template>
  <div class="space-y-1.5 py-1">
    <div class="flex items-center justify-between text-xs">
      <span class="text-zinc-300 font-medium">{{ label }}</span>
      <div class="flex items-center gap-1.5">
        <span
          class="font-mono text-[11px] px-1.5 py-0.5 rounded"
          :class="isChanged ? 'text-zinc-100 font-semibold bg-[#2e2e2e]' : 'text-zinc-500 bg-[#242424]'"
        >
          {{ modelValue > 0 && min < 0 ? '+' : '' }}{{ modelValue }}{{ unit }}
        </span>
        <button
          v-if="isChanged"
          @click="reset"
          class="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition"
          title="Reset to default"
        >
          <RotateCcw class="w-3 h-3" />
        </button>
      </div>
    </div>

    <!-- Slider with track -->
    <div class="relative flex items-center">
        <input
          type="range"
          :min="min"
          :max="max"
          :step="step"
          :value="modelValue"
          @input="onInput"
          class="w-full h-1.5 bg-[#2e2e2e] rounded-lg appearance-none cursor-pointer"
        />
    </div>
  </div>
</template>
