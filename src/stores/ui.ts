import { defineStore } from 'pinia'
import { ref } from 'vue'

export type RemarkFilter = 'all' | 'any' | 'open' | 'mine'

/** UI state that should survive navigation between screens. */
export const useUiStore = defineStore('ui', () => {
  const stageF = ref<'all' | number>('all')
  const statusF = ref('all')
  const remarksF = ref<RemarkFilter>('all')
  const q = ref('')

  const remarksFor = ref<string | null>(null)
  const remarksStage = ref(1)
  const openRemarks = (id: string, stage: number) => {
    remarksFor.value = id
    remarksStage.value = stage
  }
  const closeRemarks = () => (remarksFor.value = null)

  const newOpen = ref(false)

  return { stageF, statusF, remarksF, q, remarksFor, remarksStage, openRemarks, closeRemarks, newOpen }
})
