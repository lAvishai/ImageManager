import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AppSettings {
  topImagePrompt: string
  topTextLocation: number
  bottomImagePrompt: string
  bottomTextLocation: number
  elephantDescription: string
  giraffeDescription: string
  foxDescription: string
  promptText: string
  timeZone: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  topImagePrompt: '',
  topTextLocation: 10,
  bottomImagePrompt: '',
  bottomTextLocation: 85,
  elephantDescription: '',
  giraffeDescription: '',
  foxDescription: '',
  promptText: '',
  timeZone: 'Asia/Jerusalem',
}

const STORAGE_KEY = 'pilgi_settings'

function loadSavedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      topImagePrompt: typeof parsed.topImagePrompt === 'string' ? parsed.topImagePrompt : DEFAULT_SETTINGS.topImagePrompt,
      topTextLocation: typeof parsed.topTextLocation === 'number' ? parsed.topTextLocation : DEFAULT_SETTINGS.topTextLocation,
      bottomImagePrompt: typeof parsed.bottomImagePrompt === 'string' ? parsed.bottomImagePrompt : DEFAULT_SETTINGS.bottomImagePrompt,
      bottomTextLocation: typeof parsed.bottomTextLocation === 'number' ? parsed.bottomTextLocation : DEFAULT_SETTINGS.bottomTextLocation,
      elephantDescription: typeof parsed.elephantDescription === 'string' ? parsed.elephantDescription : DEFAULT_SETTINGS.elephantDescription,
      giraffeDescription: typeof parsed.giraffeDescription === 'string' ? parsed.giraffeDescription : DEFAULT_SETTINGS.giraffeDescription,
      foxDescription: typeof parsed.foxDescription === 'string' ? parsed.foxDescription : DEFAULT_SETTINGS.foxDescription,
      promptText: typeof parsed.promptText === 'string' ? parsed.promptText : DEFAULT_SETTINGS.promptText,
      timeZone: typeof parsed.timeZone === 'string' && parsed.timeZone ? parsed.timeZone : DEFAULT_SETTINGS.timeZone,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const current = ref<AppSettings>(loadSavedSettings())

  function save(newSettings: AppSettings) {
    current.value = { ...newSettings }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current.value))
    } catch {
      // Storage might be full or restricted
    }
  }

  function reload() {
    current.value = loadSavedSettings()
  }

  function reset() {
    save({ ...DEFAULT_SETTINGS })
  }

  return {
    current,
    save,
    reset,
    reload,
  }
})
