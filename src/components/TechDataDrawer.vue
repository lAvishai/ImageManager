<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { last, type PilgiRecord } from '../domain'
import { useRecordsStore } from '../stores/records'
import { useSettingsStore } from '../stores/settings'

const props = defineProps<{
  open: boolean
  record?: PilgiRecord
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useRecordsStore()
const settings = useSettingsStore()

// Card 1: Scenario & Image Prompt
const scenarioDraft = ref('')
const imagePromptDraft = ref('')
const copied = ref(false)
const copiedPrompt = ref(false)

function getCharacterName(rawName?: string, fallback = ''): string {
  if (!rawName?.trim()) return fallback
  const t = rawName.trim()
  return t.toLowerCase().startsWith('the ') ? t : 'The ' + t
}

function getRawScenario(rec?: PilgiRecord): string {
  if (!rec) return ''
  const st2 = rec.stage2
  const v = (st2.selectedVersionNumber ? st2.versions.find((x) => x.versionNumber === st2.selectedVersionNumber) : null) || last(st2)
  return v?.scenario || ''
}

function processScenario(raw: string, rec?: PilgiRecord): string {
  if (!raw) return ''
  const charA = getCharacterName(rec?.characters?.[0], 'Character A')
  const charB = getCharacterName(rec?.characters?.[1], 'Character B')
  return raw
    .replace(/#A\b/gi, charA)
    .replace(/#B\b/gi, charB)
}

function buildImagePrompt(scenario: string): string {
  const template = settings.current.promptText || ''
  if (!template) return scenario
  if (/@scenario\b/i.test(template)) {
    return template.replace(/@scenario\b/gi, scenario)
  }
  return `${template}\n\n${scenario}`
}

function syncImagePrompt() {
  imagePromptDraft.value = buildImagePrompt(scenarioDraft.value)
}

function syncScenario() {
  const raw = getRawScenario(props.record)
  scenarioDraft.value = processScenario(raw, props.record)
  syncImagePrompt()
}

watch(scenarioDraft, (newScenario) => {
  imagePromptDraft.value = buildImagePrompt(newScenario)
})

async function copyScenario() {
  if (!scenarioDraft.value) return
  try {
    await navigator.clipboard.writeText(scenarioDraft.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = scenarioDraft.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}

async function copyImagePrompt() {
  if (!imagePromptDraft.value) return
  try {
    await navigator.clipboard.writeText(imagePromptDraft.value)
    copiedPrompt.value = true
    setTimeout(() => (copiedPrompt.value = false), 2000)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = imagePromptDraft.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copiedPrompt.value = true
    setTimeout(() => (copiedPrompt.value = false), 2000)
  }
}

// Card 2: Text Generation
const topTextOffset = ref<number>(700)
const bottomTextOffset = ref<number>(2300)
const fontSize = ref<number>(120)
const saving = ref(false)
const saved = ref(false)

function syncTextGen() {
  if (!props.record) return
  const defTop = settings.current.topTextLocation ?? 700
  const defBottom = settings.current.bottomTextLocation ?? 2300
  const defFont = settings.current.defaultFontSize ?? 120

  topTextOffset.value = typeof props.record.topTextOffset === 'number' ? props.record.topTextOffset : defTop
  bottomTextOffset.value = typeof props.record.bottomTextOffset === 'number' ? props.record.bottomTextOffset : defBottom
  fontSize.value = typeof props.record.fontSize === 'number' ? props.record.fontSize : defFont
}

watch(
  () => [props.open, props.record?.id],
  () => {
    if (props.open && props.record) {
      syncScenario()
      syncTextGen()
      copied.value = false
      copiedPrompt.value = false
      saved.value = false
    }
  },
  { immediate: true },
)

const hasChanges = computed(() => {
  if (!props.record) return false
  const curTop = typeof props.record.topTextOffset === 'number' ? props.record.topTextOffset : (settings.current.topTextLocation ?? 700)
  const curBottom = typeof props.record.bottomTextOffset === 'number' ? props.record.bottomTextOffset : (settings.current.bottomTextLocation ?? 2300)
  const curFont = typeof props.record.fontSize === 'number' ? props.record.fontSize : (settings.current.defaultFontSize ?? 120)

  return (
    topTextOffset.value !== curTop ||
    bottomTextOffset.value !== curBottom ||
    fontSize.value !== curFont
  )
})

async function saveTextGen() {
  if (!props.record) return
  saving.value = true
  await store.updateTechData(props.record.id, {
    topTextOffset: Number(topTextOffset.value) || 0,
    bottomTextOffset: Number(bottomTextOffset.value) || 0,
    fontSize: Number(fontSize.value) || 24,
  })
  saving.value = false
  saved.value = true
  setTimeout(() => (saved.value = false), 2200)
}

function resetToDefaults() {
  topTextOffset.value = settings.current.topTextLocation ?? 700
  bottomTextOffset.value = settings.current.bottomTextLocation ?? 2300
  fontSize.value = settings.current.defaultFontSize ?? 120
}
</script>

<template>
  <template v-if="props.open && props.record">
    <div
      style="position: fixed; inset: 0; z-index: 40; background: rgba(32, 30, 29, 0.22); backdrop-filter: blur(1px); transition: opacity 0.2s"
      @click="emit('close')"
    ></div>

    <aside
      data-screen-label="Tech Data"
      style="position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(480px, 100%); display: flex; flex-direction: column; background: var(--color-bg); box-shadow: var(--shadow-lg); border-radius: calc(var(--radius-lg) * 1.4) 0 0 calc(var(--radius-lg) * 1.4); overflow: hidden"
    >
      <!-- Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); padding: var(--space-6) var(--space-6) var(--space-4); border-bottom: 1px solid var(--color-divider)">
        <div>
          <h3 style="margin: 0; font-size: 20px">Tech Data</h3>
          <span class="text-muted" style="font-size: 13px">{{ props.record.id }} · Technical parameters &amp; prompt data</span>
        </div>
        <button
          class="btn btn-ghost btn-icon"
          aria-label="Close tech data"
          title="Close"
          style="width: 36px; height: 36px; padding: 0"
          @click="emit('close')"
        >
          <Icon name="x" :size="18" />
        </button>
      </div>

      <!-- Scrollable Drawer Body -->
      <div style="flex: 1; overflow-y: auto; padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-6)">
        
        <!-- Card 1: Scenario & Image Prompt -->
        <section style="display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-5, var(--space-4)); border-radius: calc(var(--radius-lg) * 1.15); background: var(--color-surface); box-shadow: var(--shadow-sm)">
          
          <!-- Scenario Subsection -->
          <div style="display: flex; flex-direction: column; gap: var(--space-2)">
            <div style="display: flex; align-items: center; justify-content: space-between">
              <h4 style="margin: 0; font-size: 16px">Scenario</h4>
              <span class="tag tag-neutral" style="font-size: 11px">Preview only</span>
            </div>
            <p class="text-muted" style="margin: 0; font-size: 12px; line-height: 1.4">
              Replaces <code>#A</code> with Character A ({{ props.record.characters?.[0] ? 'The ' + props.record.characters[0] : 'not set' }}) and <code>#B</code> with Character B ({{ props.record.characters?.[1] ? 'The ' + props.record.characters[1] : 'not set' }}). Edits here are not saved in the record.
            </p>

            <textarea
              v-model="scenarioDraft"
              class="input"
              rows="4"
              style="border-radius: var(--radius-md); min-height: 95px; resize: vertical; line-height: 1.45; font-size: 13px; background: var(--color-bg)"
              placeholder="No scenario text available for this record yet."
            ></textarea>

            <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: 2px">
              <button
                class="btn btn-ghost"
                style="font-size: 12px; padding-inline: var(--space-2)"
                title="Re-compute scenario from record"
                @click="syncScenario"
              >
                Reset scenario
              </button>
              <button
                class="btn btn-secondary"
                :disabled="!scenarioDraft.trim()"
                style="display: inline-flex; align-items: center; gap: var(--space-2); padding-block: 6px"
                @click="copyScenario"
              >
                <Icon :name="copied ? 'check' : 'file'" :size="14" />
                <span>{{ copied ? 'Copied scenario!' : 'Copy scenario' }}</span>
              </button>
            </div>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--color-divider); margin: 0" />

          <!-- Image Prompt Subsection -->
          <div style="display: flex; flex-direction: column; gap: var(--space-2)">
            <div style="display: flex; align-items: center; justify-content: space-between">
              <h4 style="margin: 0; font-size: 16px">Image Prompt</h4>
              <span class="tag tag-neutral" style="font-size: 11px">Preview only</span>
            </div>
            <p class="text-muted" style="margin: 0; font-size: 12px; line-height: 1.4">
              Contains Settings <strong>Prompt Template</strong> with <code>@scenario</code> replaced by the Scenario above. Edits are not saved in the record.
            </p>

            <textarea
              v-model="imagePromptDraft"
              class="input"
              rows="5"
              style="border-radius: var(--radius-md); min-height: 110px; resize: vertical; line-height: 1.45; font-size: 13px; background: var(--color-bg)"
              placeholder="Settings Prompt Template is empty or no scenario available."
            ></textarea>

            <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: 2px">
              <button
                class="btn btn-ghost"
                style="font-size: 12px; padding-inline: var(--space-2)"
                title="Re-compute image prompt from settings template"
                @click="syncImagePrompt"
              >
                Reset prompt
              </button>
              <button
                class="btn btn-primary"
                :disabled="!imagePromptDraft.trim()"
                style="display: inline-flex; align-items: center; gap: var(--space-2); padding-block: 6px"
                @click="copyImagePrompt"
              >
                <Icon :name="copiedPrompt ? 'check' : 'file'" :size="14" />
                <span>{{ copiedPrompt ? 'Copied prompt!' : 'Copy to clipboard' }}</span>
              </button>
            </div>
          </div>

        </section>

        <!-- Card 2: Text Generation -->
        <section style="display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-5, var(--space-4)); border-radius: calc(var(--radius-lg) * 1.15); background: var(--color-surface); box-shadow: var(--shadow-sm)">
          <div style="display: flex; align-items: center; justify-content: space-between">
            <h4 style="margin: 0; font-size: 16px">Text Generation</h4>
            <span class="tag tag-accent" style="font-size: 11px">Saved in record</span>
          </div>
          <p class="text-muted" style="margin: 0; font-size: 12px; line-height: 1.4">
            Custom positioning and typography overrides stored directly with this PilGi record.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3)">
            <div class="field" style="margin: 0">
              <label for="tdTopTextOffset">Top Text Offset</label>
              <input
                id="tdTopTextOffset"
                v-model.number="topTextOffset"
                type="number"
                class="input"
                style="background: var(--color-bg)"
                placeholder="700"
              />
            </div>

            <div class="field" style="margin: 0">
              <label for="tdBottomTextOffset">Bottom Text Offset</label>
              <input
                id="tdBottomTextOffset"
                v-model.number="bottomTextOffset"
                type="number"
                class="input"
                style="background: var(--color-bg)"
                placeholder="2300"
              />
            </div>
          </div>

          <div class="field" style="margin: 0">
            <label for="tdFontSize">Font Size</label>
            <input
              id="tdFontSize"
              v-model.number="fontSize"
              type="number"
              class="input"
              style="background: var(--color-bg)"
              placeholder="120"
              min="1"
            />
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: var(--space-1)">
            <button
              class="btn btn-ghost"
              style="font-size: 12px; padding-inline: var(--space-2)"
              title="Reset values to app defaults"
              @click="resetToDefaults"
            >
              Reset to app defaults
            </button>
            <button
              class="btn btn-primary"
              :disabled="saving || !hasChanges"
              style="display: inline-flex; align-items: center; gap: var(--space-2)"
              @click="saveTextGen"
            >
              <Icon v-if="saved" name="check" :size="15" />
              <span>{{ saved ? 'Saved!' : saving ? 'Saving…' : 'Save offsets' }}</span>
            </button>
          </div>
        </section>

      </div>
    </aside>
  </template>
</template>
