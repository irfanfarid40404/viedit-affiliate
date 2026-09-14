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
    <div class="flex items-center justify-between pb-2 border-b border-[#232733]">
      <div class="flex items-center gap-2">
        <Type class="w-4 h-4 text-amber-400" />
        <h3 class="text-sm font-semibold text-white">Text Overlay</h3>
      </div>
      <button
        @click="handleAddText"
        class="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded flex items-center gap-1 transition"
      >
        <Plus class="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Add Text</span>
      </button>
    </div>

    <!-- Viral Affiliate Hook Templates Section -->
    <div class="p-3 rounded-xl bg-gradient-to-b from-[#181c2b] to-[#131622] border border-indigo-500/30 space-y-2.5 shadow-lg">
      <div
        class="flex items-center justify-between cursor-pointer select-none"
        @click="isTemplatesOpen = !isTemplatesOpen"
      >
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Sparkles class="w-3.5 h-3.5" />
          </div>
          <div>
            <span class="text-xs font-bold text-white block">Template Hook Affiliate</span>
            <span class="text-[10px] text-zinc-400">5 Pilihan Teks Viral Siap Pakai</span>
          </div>
        </div>
        <component :is="isTemplatesOpen ? ChevronUp : ChevronDown" class="w-4 h-4 text-zinc-400" />
      </div>

      <div v-show="isTemplatesOpen" class="space-y-2 pt-1">
        <div
          v-for="tmpl in HOOK_TEMPLATES"
          :key="tmpl.id"
          class="p-2.5 rounded-lg bg-[#10121a] border border-[#232738] hover:border-indigo-500/50 transition flex flex-col gap-1.5"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-zinc-200">
              {{ tmpl.title }}
            </span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/20">
              {{ tmpl.category }}
            </span>
          </div>

          <pre class="text-[10.5px] font-sans text-zinc-400 bg-[#0d0f15] p-2 rounded border border-white/5 whitespace-pre leading-relaxed overflow-x-hidden">{{ tmpl.text }}</pre>

          <button
            @click="applyTemplate(tmpl)"
            class="w-full py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-transparent rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
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
      <div v-if="projectStore.texts.length === 0" class="p-4 rounded-lg bg-[#141620] border border-[#232733] text-center text-xs text-zinc-500">
        No text layers yet. Click <span class="text-amber-400">Add Text</span> to place typography on video.
      </div>
      <div
        v-for="t in projectStore.texts"
        :key="t.id"
        @click="selectLayer(t.id)"
        class="p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition"
        :class="[
          editorStore.selectedTextId === t.id
            ? 'bg-amber-500/10 border-amber-500/50 text-white'
            : 'bg-[#141620] border-[#232733] text-zinc-400 hover:text-zinc-200 hover:bg-[#181b28]'
        ]"
      >
        <div class="flex items-center gap-2 truncate">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-xs font-medium truncate max-w-[140px]">{{ t.text || '(Empty text)' }}</span>
          <span class="text-[10px] font-mono text-zinc-500">({{ t.startTime }}s - {{ t.endTime }}s)</span>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click.stop="handleDuplicateText(t.id)"
            class="p-1 text-zinc-500 hover:text-white rounded"
            title="Duplicate"
          >
            <Copy class="w-3.5 h-3.5" />
          </button>
          <button
            @click.stop="handleDeleteText(t.id)"
            class="p-1 text-zinc-500 hover:text-red-400 rounded"
            title="Delete"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Selected Text Inspector Details -->
    <div v-if="selectedText" class="space-y-4 pt-2 border-t border-[#232733]">
      <div class="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
        Text Properties
      </div>

      <!-- Text Content Input -->
      <div>
        <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Text Content (Enter untuk baris baru, spasi dipertahankan)</label>
        <textarea
          v-model="selectedText.text"
          rows="3"
          placeholder="Ketik teks... (Enter untuk ganti baris, spasi tetap tersimpan)"
          class="w-full bg-[#161822] border border-[#272d3e] focus:border-amber-500 rounded p-2 text-xs text-white outline-none resize-y"
        ></textarea>
      </div>

      <!-- Font Family Picker -->
      <div>
        <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Font Family</label>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="opt in FONT_OPTIONS"
            :key="opt.label"
            @click="selectedText.fontFamily = opt.label"
            class="px-2 py-1.5 rounded border text-xs truncate transition text-center"
            :style="{ fontFamily: opt.fontFamily }"
            :class="[
              selectedText.fontFamily === opt.label
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                : 'bg-[#161822] border-[#252a3a] text-zinc-300 hover:text-white'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Font Size & Color -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Size ({{ selectedText.fontSize }}px)</label>
          <input
            type="range"
            min="14"
            max="96"
            v-model.number="selectedText.fontSize"
            class="w-full accent-amber-500"
          />
        </div>

        <div>
          <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Scale ({{ Math.round((selectedText.scale || 1) * 100) }}%)</label>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.05"
            v-model.number="selectedText.scale"
            class="w-full accent-amber-500"
          />
        </div>
      </div>

      <!-- Quick Position Controls -->
      <div>
        <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Position Alignment</label>
        <div class="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            @click="selectedText.x = 50; selectedText.y = 50"
            class="py-1.5 px-2 bg-[#161822] hover:bg-indigo-600/30 text-zinc-300 hover:text-white border border-[#252a3a] hover:border-indigo-500/50 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition"
            title="Tepat di Tengah Layar"
          >
            <Crosshair class="w-3 h-3 text-indigo-400" />
            <span>Center</span>
          </button>
          <button
            type="button"
            @click="selectedText.x = 50"
            class="py-1.5 px-2 bg-[#161822] hover:bg-[#202538] text-zinc-300 rounded border border-[#252a3a] text-[11px] font-medium transition"
            title="Tengah Horizontal"
          >
            Center X
          </button>
          <button
            type="button"
            @click="selectedText.y = 50"
            class="py-1.5 px-2 bg-[#161822] hover:bg-[#202538] text-zinc-300 rounded border border-[#252a3a] text-[11px] font-medium transition"
            title="Tengah Vertikal"
          >
            Center Y
          </button>
          <button
            type="button"
            @click="selectedText.x = 50; selectedText.y = 80"
            class="py-1.5 px-2 bg-[#161822] hover:bg-[#202538] text-zinc-300 rounded border border-[#252a3a] text-[11px] font-medium transition"
            title="Bawah Tengah (Caption)"
          >
            Bottom
          </button>
        </div>
      </div>

      <!-- Color Picker -->
      <div>
        <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Text Color</label>
        <div class="flex items-center gap-2 bg-[#161822] border border-[#272d3e] p-1.5 rounded">
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
          <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Rotate ({{ selectedText.rotation }}°)</label>
          <input
            type="range"
            min="-180"
            max="180"
            v-model.number="selectedText.rotation"
            class="w-full accent-amber-500"
          />
        </div>

        <div>
          <label class="text-[11px] text-zinc-400 block mb-1 font-medium">Opacity ({{ Math.round(selectedText.opacity * 100) }}%)</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            v-model.number="selectedText.opacity"
            class="w-full accent-amber-500"
          />
        </div>
      </div>

      <!-- Shadow & Stroke -->
      <div class="space-y-2 p-2.5 rounded-lg bg-[#141620] border border-[#232733]">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium">Drop Shadow</span>
          <input
            type="checkbox"
            v-model="selectedText.shadow.enabled"
            class="rounded accent-amber-500"
          />
        </div>

        <div class="flex items-center justify-between text-xs pt-1 border-t border-[#1f2230]">
          <span class="text-zinc-300 font-medium">Stroke Outline</span>
          <input
            type="checkbox"
            v-model="selectedText.stroke.enabled"
            class="rounded accent-amber-500"
          />
        </div>
      </div>

      <!-- Timing on Timeline (Strictly Clip 1: 0 - 10s) -->
      <div class="p-2.5 rounded-lg bg-[#141620] border border-[#232733] space-y-2">
        <div class="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
          <Clock class="w-3.5 h-3.5 text-amber-400" />
          <span>Timeline Timing (Klip 1: 00:00 - 00:10)</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label class="text-[10px] text-zinc-400">Start Time (sec)</label>
            <input
              type="number"
              min="0"
              :max="Math.min(9.5, selectedText.endTime - 0.5)"
              step="0.5"
              v-model.number="selectedText.startTime"
              class="w-full bg-[#161822] border border-[#272d3e] rounded px-2 py-1 text-white"
            />
          </div>
          <div>
            <label class="text-[10px] text-zinc-400">End Time (max 10s)</label>
            <input
              type="number"
              :min="selectedText.startTime + 0.5"
              max="10"
              step="0.5"
              v-model.number="selectedText.endTime"
              class="w-full bg-[#161822] border border-[#272d3e] rounded px-2 py-1 text-white"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
