import { defineStore } from 'pinia'
import { ref } from 'vue'

export type EditorTab =
  | 'media'
  | 'crop'
  | 'ai'
  | 'text'
  | 'filters'
  | 'effects'
  | 'audio'
  | 'transition'
  | 'export'

export interface EditorNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export const useEditorStore = defineStore('editor', () => {
  const activeTab = ref<EditorTab>('ai')
  const selectedTextId = ref<string | null>(null)
  const isTrimmingModalOpen = ref<boolean>(false)
  const isExportModalOpen = ref<boolean>(false)
  const timelineZoom = ref<number>(1) // 1 to 3
  const notifications = ref<EditorNotification[]>([])
  const previewWidth = ref<number>(360)
  const previewHeight = ref<number>(640)

  function setActiveTab(tab: EditorTab) {
    activeTab.value = tab
  }

  function setSelectedTextId(id: string | null) {
    selectedTextId.value = id
    if (id && activeTab.value !== 'text') {
      activeTab.value = 'text'
    }
  }

  function notify(type: EditorNotification['type'], message: string) {
    const id = 'notif-' + Date.now() + Math.random()
    notifications.value.push({ id, type, message })
    setTimeout(() => {
      notifications.value = notifications.value.filter((n) => n.id !== id)
    }, 4500)
  }

  return {
    activeTab,
    selectedTextId,
    isTrimmingModalOpen,
    isExportModalOpen,
    timelineZoom,
    notifications,
    previewWidth,
    previewHeight,
    setActiveTab,
    setSelectedTextId,
    notify,
  }
})
