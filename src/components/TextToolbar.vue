<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Crosshair,
  Copy,
  Trash2,
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

const currentText = computed(() => {
  return projectStore.texts.find((t) => t.id === editorStore.selectedTextId)
})

function centerPosition() {
  if (!currentText.value) return
  projectStore.updateText(currentText.value.id, { x: 50, y: 50 })
}

function toggleBold() {
  if (!currentText.value) return
  projectStore.updateText(currentText.value.id, { bold: !currentText.value.bold })
}

function toggleItalic() {
  if (!currentText.value) return
  projectStore.updateText(currentText.value.id, { italic: !currentText.value.italic })
}

function toggleUnderline() {
  if (!currentText.value) return
  projectStore.updateText(currentText.value.id, { underline: !currentText.value.underline })
}

function setAlign(align: 'left' | 'center' | 'right') {
  if (!currentText.value) return
  projectStore.updateText(currentText.value.id, { textAlign: align })
}

function handleDuplicate() {
  if (!currentText.value) return
  const newId = projectStore.duplicateText(currentText.value.id)
  if (newId) editorStore.setSelectedTextId(newId)
}

function handleDelete() {
  if (!currentText.value) return
  projectStore.deleteText(currentText.value.id)
  editorStore.setSelectedTextId(null)
}
</script>

<template>
  <div
    v-if="currentText"
    class="flex items-center gap-1 bg-[#222222] border border-[#383838] p-1 rounded-md shadow-lg text-zinc-300"
  >
    <button
      @click="toggleBold"
      class="p-1.5 rounded hover:bg-[#2e2e2e] transition"
      :class="{ 'bg-[#3a3a3a] text-zinc-100': currentText.bold }"
      title="Bold"
    >
      <Bold class="w-3.5 h-3.5" />
    </button>
    <button
      @click="toggleItalic"
      class="p-1.5 rounded hover:bg-[#2e2e2e] transition"
      :class="{ 'bg-[#3a3a3a] text-zinc-100': currentText.italic }"
      title="Italic"
    >
      <Italic class="w-3.5 h-3.5" />
    </button>
    <button
      @click="toggleUnderline"
      class="p-1.5 rounded hover:bg-[#2e2e2e] transition"
      :class="{ 'bg-[#3a3a3a] text-zinc-100': currentText.underline }"
      title="Underline"
    >
      <Underline class="w-3.5 h-3.5" />
    </button>

    <div class="h-4 w-px bg-[#3d3d3d] mx-1"></div>

    <button
      @click="setAlign('left')"
      class="p-1.5 rounded hover:bg-[#2e2e2e] transition"
      :class="{ 'bg-[#3a3a3a] text-zinc-100': currentText.textAlign === 'left' }"
      title="Align Left"
    >
      <AlignLeft class="w-3.5 h-3.5" />
    </button>
    <button
      @click="setAlign('center')"
      class="p-1.5 rounded hover:bg-[#2e2e2e] transition"
      :class="{ 'bg-[#3a3a3a] text-zinc-100': !currentText.textAlign || currentText.textAlign === 'center' }"
      title="Align Center"
    >
      <AlignCenter class="w-3.5 h-3.5" />
    </button>
    <button
      @click="setAlign('right')"
      class="p-1.5 rounded hover:bg-[#2e2e2e] transition"
      :class="{ 'bg-[#3a3a3a] text-zinc-100': currentText.textAlign === 'right' }"
      title="Align Right"
    >
      <AlignRight class="w-3.5 h-3.5" />
    </button>

    <div class="h-4 w-px bg-[#3d3d3d] mx-1"></div>

    <button
      @click="centerPosition"
      class="px-2 py-1 rounded bg-[#2e2e2e] hover:bg-[#3a3a3a] text-zinc-200 border border-[#454545] text-xs font-medium flex items-center gap-1 transition"
      title="Pusatkan Teks ke Pas Tengah Layar (50%, 50%)"
    >
      <Crosshair class="w-3.5 h-3.5" />
      <span>Center</span>
    </button>

    <div class="h-4 w-px bg-[#3d3d3d] mx-1"></div>

    <button
      @click="handleDuplicate"
      class="p-1.5 rounded hover:bg-[#2e2e2e] text-zinc-500 hover:text-zinc-100 transition"
      title="Duplicate"
    >
      <Copy class="w-3.5 h-3.5" />
    </button>

    <button
      @click="handleDelete"
      class="p-1.5 rounded hover:bg-[#332424] text-zinc-500 hover:text-[#d9a8a8] transition"
      title="Delete"
    >
      <Trash2 class="w-3.5 h-3.5" />
    </button>
  </div>
</template>
