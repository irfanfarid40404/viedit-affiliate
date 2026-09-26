<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import { FONT_OPTIONS, type FontFamilyKey } from '@/types/text'
import {
  Type,
  Plus,
  Trash2,
  Copy,
  Clock,
  Palette,
  Sparkles,
  Crosshair,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const isTemplatesOpen = ref(true)

interface HookTemplate {
  id: string
  title: string
  category: string
  recommendedSize: number
  text: string
}

const HOOK_TEMPLATES: HookTemplate[] = [
  {
    id: 'hook-trading-2025',
    title: 'Trading 2025 vs 2026',
    category: 'Trading',
    recommendedSize: 32,
    text: `2025:
ga bisa trading, ga ngerti

2026:
tiba tiba jago trading, untung
berkali kali lipat cuma dengan
baca buku ini 📚💸📈`,
  },
  {
    id: 'hook-saham-2026',
    title: 'Saham 2026 vs 2027',
    category: 'Saham',
    recommendedSize: 32,
    text: `2026: asal beli saham, ngga
paham analisa.

2027: untung berkali-kali,
paham analisa, sukses didunia
saham berkat buku ini`,
  },
  {
    id: 'hook-forex-2026',
    title: 'Forex 2026 vs 2027',
    category: 'Forex',
    recommendedSize: 30,
    text: `2026: gatau analisa, money management, sering loss di forex 

2027: untung berkali-kali,
paham analisa, sukses didunia
trading berkat buku ini`,
  },
  {
    id: 'hook-dialog-forex',
    title: 'Percakapan / Dialog Forex',
    category: 'Dialog',
    recommendedSize: 32,
    text: `👥: lu kok selalu profit ditrading forex si?

🗣️: gw ngerti analisa, money management, profit konsisten gara' baca buku ini.`,
  },
  {
    id: 'hook-7-poin-buku',
    title: 'Kalo Kamu Orangnya (7 Poin)',
    category: 'Buku',
    recommendedSize: 26,
    text: `Kalo kamu orangnya :

1. Pemalas  
2. Emosian  
3. Sering bicara kasar  
4. Tidak punya tujuan  
5. Mudah tersinggung  
6. Lemot berfikir  
7. Introvert parah  

Itu artinya kamu perlu  
Baca buku ini ✨📚`,
  },
]

const selectedText = computed(() => {
  return projectStore.texts.find((t) => t.id === editorStore.selectedTextId) || null
})

function applyTemplate(tmpl: HookTemplate) {
  if (selectedText.value) {
    selectedText.value.text = tmpl.text
    selectedText.value.fontSize = tmpl.recommendedSize
    selectedText.value.startTime = 0
    selectedText.value.endTime = 10
    selectedText.value.x = 50
    selectedText.value.y = 50
    editorStore.notify('success', `Template "${tmpl.title}" diterapkan`)
  } else {
    const newId = projectStore.addText(tmpl.text)
    projectStore.updateText(newId, {
      fontSize: tmpl.recommendedSize,
      startTime: 0,
      endTime: 10,
      x: 50,
      y: 50,
      textAlign: 'center',
    })
    editorStore.setSelectedTextId(newId)
    editorStore.notify('success', `Template "${tmpl.title}" ditambahkan ke Klip 1`)
  }
}

function handleAddText() {
  const newId = projectStore.addText('THE FUTURE IS HERE')
  editorStore.setSelectedTextId(newId)
  editorStore.notify('success', 'Added new text layer')
}

function selectLayer(id: string) {
  editorStore.setSelectedTextId(id)
}

function handleDeleteText(id: string) {
  projectStore.deleteText(id)
  if (editorStore.selectedTextId === id) {
    editorStore.setSelectedTextId(null)
  }
}

function handleDuplicateText(id: string) {
  const newId = projectStore.duplicateText(id)
  if (newId) editorStore.setSelectedTextId(newId)
}
</script>

<template>
  <div class="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between pb-2 border-b border-[#2c2c2c]">
      <div class="flex items-center gap-2">
        <Type class="w-4 h-4 text-zinc-500" />
        <h3 class="text-sm font-medium text-zinc-100">Text Overlay</h3>
      </div>
      <button
        @click="handleAddText"
        class="text-xs px-2.5 py-1 bg-[#e0972f] hover:bg-[#eba63f] text-[#1a1205] font-semibold rounded flex items-center gap-1 transition"
      >
        <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Add Text</span>
      </button>
    </div>

    <!-- Viral Affiliate Hook Templates Section -->
    <div class="p-3 rounded-md bg-[#202020] border border-[#2c2c2c] space-y-2.5">
      <div
        class="flex items-center justify-between cursor-pointer select-none"
        @click="isTemplatesOpen = !isTemplatesOpen"
      >
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-zinc-500">
            <Sparkles class="w-3.5 h-3.5" />
          </div>
          <div>
            <span class="text-xs font-medium text-zinc-100 block">Template Hook Affiliate</span>
            <span class="text-[10px] text-zinc-500">5 Pilihan Teks Viral Siap Pakai</span>
          </div>
        </div>
        <component :is="isTemplatesOpen ? ChevronUp : ChevronDown" class="w-4 h-4 text-zinc-600" />
      </div>

      <div v-show="isTemplatesOpen" class="space-y-2 pt-1">
        <div
          v-for="tmpl in HOOK_TEMPLATES"
          :key="tmpl.id"
          class="p-2.5 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] transition flex flex-col gap-1.5"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-zinc-200">
              {{ tmpl.title }}
            </span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#262626] text-zinc-500 font-mono border border-[#2e2e2e]">
              {{ tmpl.category }}
            </span>
          </div>

          <pre class="text-[10.5px] font-sans text-zinc-500 bg-[#161616] p-2 rounded border border-[#242424] whitespace-pre leading-relaxed overflow-x-hidden">{{ tmpl.text }}</pre>

          <button
            @click="applyTemplate(tmpl)"
            class="w-full py-1.5 px-2 bg-[#262626] hover:bg-[#303030] text-zinc-300 border border-[#333] hover:border-[#444] rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
          >
            <Check class="w-3 h-3" />
            <span>{{ selectedText ? 'Terapkan ke Teks Terpilih' : 'Gunakan Template Ini' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Text Layers List -->
    <div class="space-y-1.5">
      <div class="text-xs font-medium text-zinc-400">Layers on Timeline</div>
      <div v-if="projectStore.texts.length === 0" class="p-4 rounded-md bg-[#202020] border border-[#2c2c2c] text-center text-xs text-zinc-600">
        No text layers yet. Click <span class="text-zinc-300">Add Text</span> to place typography on video.
      </div>
      <div
        v-for="t in projectStore.texts"
        :key="t.id"
        @click="selectLayer(t.id)"
        class="p-2.5 rounded-md border flex items-center justify-between cursor-pointer transition"
        :class="[
          editorStore.selectedTextId === t.id
            ? 'bg-[#2e2e2e] border-[#555] text-zinc-100'
            : 'bg-[#202020] border-[#2c2c2c] text-zinc-500 hover:text-zinc-200 hover:bg-[#262626]'
        ]"
      >
        <div class="flex items-center gap-2 truncate">
          <span class="w-2 h-2 rounded-sm bg-[#9c7a3c]"></span>
          <span class="text-xs font-medium truncate max-w-[140px]">{{ t.text || '(Empty text)' }}</span>
          <span class="text-[10px] font-mono text-zinc-600">({{ t.startTime }}s - {{ t.endTime }}s)</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click.stop="handleDuplicateText(t.id)"
            class="p-1 text-zinc-600 hover:text-zinc-200 rounded"
            title="Duplicate"
          >
            <Copy class="w-3.5 h-3.5" />
          </button>
          <button
            @click.stop="handleDeleteText(t.id)"
            class="p-1 text-zinc-600 hover:text-[#c98a8a] rounded"
            title="Delete"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Selected Text Inspector Details -->
    <div v-if="selectedText" class="space-y-4 pt-2 border-t border-[#2c2c2c]">
      <div class="text-[11px] uppercase tracking-wider text-zinc-600 font-medium">
        Text Properties
      </div>

      <!-- Text Content Input -->
      <div>
        <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Text Content (Enter untuk baris baru, spasi dipertahankan)</label>
        <textarea
          v-model="selectedText.text"
          rows="3"
          placeholder="Ketik teks... (Enter untuk ganti baris, spasi tetap tersimpan)"
          class="w-full bg-[#242424] border border-[#333] focus:border-[#e0972f] rounded p-2 text-xs text-zinc-100 outline-none resize-y"
        ></textarea>
      </div>

      <!-- Font Family Picker -->
      <div>
        <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Font Family</label>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="opt in FONT_OPTIONS"
            :key="opt.label"
            @click="selectedText.fontFamily = opt.label"
            class="px-2 py-1.5 rounded border text-xs truncate transition text-center"
            :style="{ fontFamily: opt.fontFamily }"
            :class="[
              selectedText.fontFamily === opt.label
                ? 'bg-[#2e2e2e] border-[#555] text-zinc-100 font-semibold'
                : 'bg-[#242424] border-[#2c2c2c] text-zinc-400 hover:text-zinc-200'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Font Size & Color -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Size ({{ selectedText.fontSize }}px)</label>
          <input
            type="range"
            min="14"
            max="96"
            v-model.number="selectedText.fontSize"
            class="w-full"
          />
        </div>

        <div>
          <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Scale ({{ Math.round((selectedText.scale || 1) * 100) }}%)</label>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.05"
            v-model.number="selectedText.scale"
            class="w-full"
          />
        </div>
      </div>

      <!-- Quick Position Controls -->
      <div>
        <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Position Alignment</label>
        <div class="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            @click="selectedText.x = 50; selectedText.y = 50"
            class="py-1.5 px-2 bg-[#262626] hover:bg-[#303030] text-zinc-300 border border-[#333] rounded text-[11px] font-medium flex items-center justify-center gap-1 transition"
            title="Tepat di Tengah Layar"
          >
            <Crosshair class="w-3 h-3 text-zinc-500" />
            <span>Center</span>
          </button>
          <button
            type="button"
            @click="selectedText.x = 50"
            class="py-1.5 px-2 bg-[#262626] hover:bg-[#303030] text-zinc-300 rounded border border-[#333] text-[11px] font-medium transition"
            title="Tengah Horizontal"
          >
            Center X
          </button>
          <button
            type="button"
            @click="selectedText.y = 50"
            class="py-1.5 px-2 bg-[#262626] hover:bg-[#303030] text-zinc-300 rounded border border-[#333] text-[11px] font-medium transition"
            title="Tengah Vertikal"
          >
            Center Y
          </button>
          <button
            type="button"
            @click="selectedText.x = 50; selectedText.y = 80"
            class="py-1.5 px-2 bg-[#262626] hover:bg-[#303030] text-zinc-300 rounded border border-[#333] text-[11px] font-medium transition"
            title="Bawah Tengah (Caption)"
          >
            Bottom
          </button>
        </div>
      </div>

      <!-- Color Picker -->
      <div>
        <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Text Color</label>
        <div class="flex items-center gap-2 bg-[#242424] border border-[#333] p-1.5 rounded">
          <input
            type="color"
            v-model="selectedText.color"
            class="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
          />
          <span class="font-mono text-xs text-zinc-300">{{ selectedText.color }}</span>
        </div>
      </div>

      <!-- Rotation & Opacity -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Rotate ({{ selectedText.rotation }}°)</label>
          <input
            type="range"
            min="-180"
            max="180"
            v-model.number="selectedText.rotation"
            class="w-full"
          />
        </div>

        <div>
          <label class="text-[11px] text-zinc-500 block mb-1 font-medium">Opacity ({{ Math.round(selectedText.opacity * 100) }}%)</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            v-model.number="selectedText.opacity"
            class="w-full"
          />
        </div>
      </div>

      <!-- Shadow & Stroke -->
      <div class="space-y-2 p-2.5 rounded-md bg-[#202020] border border-[#2c2c2c]">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium">Drop Shadow</span>
          <input
            type="checkbox"
            v-model="selectedText.shadow.enabled"
            class="rounded accent-[#e0972f]"
          />
        </div>

        <div class="flex items-center justify-between text-xs pt-1 border-t border-[#2c2c2c]">
          <span class="text-zinc-300 font-medium">Stroke Outline</span>
          <input
            type="checkbox"
            v-model="selectedText.stroke.enabled"
            class="rounded accent-[#e0972f]"
          />
        </div>
      </div>

      <!-- Timing on Timeline (Strictly Clip 1: 0 - 10s) -->
      <div class="p-2.5 rounded-md bg-[#202020] border border-[#2c2c2c] space-y-2">
        <div class="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
          <Clock class="w-3.5 h-3.5 text-zinc-500" />
          <span>Timeline Timing (Klip 1: 00:00 - 00:10)</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label class="text-[10px] text-zinc-500">Start Time (sec)</label>
            <input
              type="number"
              min="0"
              :max="Math.min(9.5, selectedText.endTime - 0.5)"
              step="0.5"
              v-model.number="selectedText.startTime"
              class="w-full bg-[#242424] border border-[#333] rounded px-2 py-1 text-zinc-100"
            />
          </div>
          <div>
            <label class="text-[10px] text-zinc-500">End Time (max 10s)</label>
            <input
              type="number"
              :min="selectedText.startTime + 0.5"
              max="10"
              step="0.5"
              v-model.number="selectedText.endTime"
              class="w-full bg-[#242424] border border-[#333] rounded px-2 py-1 text-zinc-100"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
