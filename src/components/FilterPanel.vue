<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import FilterSlider from './FilterSlider.vue'
import { DEFAULT_FILTERS, RESET_FILTERS, type FilterPreset } from '@/types/filter'
import { Sliders, RotateCcw, BookmarkCheck, Sparkles } from 'lucide-vue-next'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const savedPresets = ref<FilterPreset[]>([
  {
    id: 'preset-cinematic-default',
    name: 'Cinematic Default',
    filters: { ...DEFAULT_FILTERS },
  },
  {
    id: 'preset-cyberpunk',
    name: 'Neon Cyberpunk',
    filters: {
      temperature: -25,
      hue: 35,
      saturation: 40,
      brightness: -10,
      contrast: 35,
      highlight: 15,
      shadow: -20,
      illumination: 10,
      sharpen: 12,
      particles: 15,
      fade: 0,
      vignette: 65,
    },
  },
  {
    id: 'preset-vintage-warm',
    name: 'Warm Nostalgia',
    filters: {
      temperature: 30,
      hue: -10,
      saturation: -20,
      brightness: 5,
      contrast: 10,
      highlight: -15,
      shadow: 20,
      illumination: 5,
      sharpen: 5,
      particles: 10,
      fade: 12,
      vignette: 40,
    },
  },
])

const customPresetName = ref('')
const isSavingPreset = ref(false)

function applyPreset(preset: FilterPreset) {
  projectStore.filters = { ...preset.filters }
  editorStore.notify('success', `Applied preset "${preset.name}"`)
}

function handleResetAll() {
  projectStore.resetAllFilters()
  editorStore.notify('info', 'All filters reset to neutral (0)')
}

function handleApplyDefault() {
  projectStore.applyDefaultPreset()
  editorStore.notify('success', 'Restored "Cinematic Default" preset')
}

function handleSaveCustomPreset() {
  if (!customPresetName.value.trim()) return
  const newPreset: FilterPreset = {
    id: 'custom-' + Date.now(),
    name: customPresetName.value.trim(),
    filters: { ...projectStore.filters },
  }
  savedPresets.value.push(newPreset)
  customPresetName.value = ''
  isSavingPreset.value = false
  editorStore.notify('success', `Saved preset "${newPreset.name}"`)
}
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-[#2c2c2c]">
      <div class="flex items-center gap-2">
        <Sliders class="w-4 h-4 text-zinc-500" />
        <h3 class="text-sm font-medium text-zinc-100">Adjust Video Filter</h3>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          @click="handleApplyDefault"
          class="text-[11px] px-2 py-1 rounded bg-[#262626] text-zinc-300 hover:bg-[#303030] border border-[#333] transition flex items-center gap-1"
          title="Restore Cinematic Default"
        >
          <Sparkles class="w-3 h-3" />
          <span>Cinematic</span>
        </button>
        <button
          @click="handleResetAll"
          class="text-[11px] px-2 py-1 rounded bg-[#262626] text-zinc-500 hover:text-zinc-200 hover:bg-[#303030] transition flex items-center gap-1"
          title="Reset all filters to 0"
        >
          <RotateCcw class="w-3 h-3" />
          <span>Reset All</span>
        </button>
      </div>
    </div>

    <!-- Presets Quick Bar -->
    <div class="space-y-1.5">
      <span class="text-xs font-medium text-zinc-400">Presets</span>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="p in savedPresets"
          :key="p.id"
          @click="applyPreset(p)"
          class="px-2 py-1.5 rounded-md text-[11px] font-medium truncate text-center border transition"
          :class="[
            p.name === 'Cinematic Default'
              ? 'bg-[#2e2e2e] border-[#555] text-zinc-100'
              : 'bg-[#242424] border-[#2c2c2c] text-zinc-500 hover:text-zinc-200 hover:bg-[#2a2a2a]'
          ]"
        >
          {{ p.name }}
        </button>
      </div>
    </div>

    <!-- Sliders List -->
    <div class="space-y-3 pt-1">
      <div class="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Color & Tone</div>

      <FilterSlider
        label="Temperature"
        v-model="projectStore.filters.temperature"
        :min="-100"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.temperature"
      />

      <FilterSlider
        label="Hue"
        v-model="projectStore.filters.hue"
        :min="-100"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.hue"
      />

      <FilterSlider
        label="Saturation"
        v-model="projectStore.filters.saturation"
        :min="-100"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.saturation"
      />

      <FilterSlider
        label="Brightness"
        v-model="projectStore.filters.brightness"
        :min="-100"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.brightness"
      />

      <FilterSlider
        label="Contrast"
        v-model="projectStore.filters.contrast"
        :min="-100"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.contrast"
      />

      <div class="text-xs uppercase tracking-wider text-zinc-500 font-semibold pt-2">Light & Detail</div>

      <FilterSlider
        label="Highlight"
        v-model="projectStore.filters.highlight"
        :min="-100"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.highlight"
      />

      <FilterSlider
        label="Shadow"
        v-model="projectStore.filters.shadow"
        :min="-100"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.shadow"
      />

      <FilterSlider
        label="Illumination"
        v-model="projectStore.filters.illumination"
        :min="-100"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.illumination"
      />

      <FilterSlider
        label="Sharpen"
        v-model="projectStore.filters.sharpen"
        :min="0"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.sharpen"
      />

      <div class="text-xs uppercase tracking-wider text-zinc-500 font-semibold pt-2">Overlays & Effects</div>

      <FilterSlider
        label="Particles"
        v-model="projectStore.filters.particles"
        :min="0"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.particles"
      />

      <FilterSlider
        label="Fade"
        v-model="projectStore.filters.fade"
        :min="0"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.fade"
      />

      <FilterSlider
        label="Vignette"
        v-model="projectStore.filters.vignette"
        :min="0"
        :max="100"
        :defaultValue="DEFAULT_FILTERS.vignette"
      />
    </div>

    <!-- Save Preset Action -->
    <div class="pt-3 border-t border-[#2c2c2c]">
      <div v-if="!isSavingPreset">
        <button
          @click="isSavingPreset = true"
          class="w-full py-2 px-3 rounded-md bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] text-xs font-medium text-zinc-300 flex items-center justify-center gap-2 transition"
        >
          <BookmarkCheck class="w-3.5 h-3.5 text-zinc-500" />
          <span>Save Current As Preset</span>
        </button>
      </div>
      <div v-else class="space-y-2">
        <input
          v-model="customPresetName"
          placeholder="Preset Name (e.g. My Style)"
          class="w-full bg-[#242424] border border-[#333] rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#e0972f]"
          @keyup.enter="handleSaveCustomPreset"
        />
        <div class="flex items-center gap-2">
          <button
            @click="handleSaveCustomPreset"
            class="flex-1 py-1.5 bg-[#e0972f] hover:bg-[#eba63f] text-[#1a1205] text-xs font-semibold rounded transition"
          >
            Save
          </button>
          <button
            @click="isSavingPreset = false"
            class="py-1.5 px-3 bg-[#262626] hover:bg-[#303030] text-zinc-400 text-xs rounded transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
