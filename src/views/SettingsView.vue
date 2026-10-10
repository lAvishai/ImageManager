<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import VersionHistoryModal from '../components/VersionHistoryModal.vue'
import { CHARACTER_ICONS, fmt, now } from '../domain'
import { useRecordsStore } from '../stores/records'
import { type AppSettings, useSettingsStore } from '../stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const recordsStore = useRecordsStore()

const form = reactive<AppSettings>({
  topImagePrompt: '',
  topTextLocation: 700,
  bottomImagePrompt: '',
  bottomTextLocation: 2300,
  defaultFontSize: 120,
  centerAlign: 768,
  elephantDescription: '',
  giraffeDescription: '',
  foxDescription: '',
  promptText: '',
  timeZone: 'Asia/Jerusalem',
})

const TIME_ZONES = [
  { value: 'Asia/Jerusalem', label: 'Israel (Asia/Jerusalem · UTC+2 / UTC+3)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/London', label: 'London / Dublin (UTC+0 / UTC+1)' },
  { value: 'Europe/Paris', label: 'Paris / Berlin / Rome (UTC+1 / UTC+2)' },
  { value: 'Europe/Athens', label: 'Athens / Bucharest (UTC+2 / UTC+3)' },
  { value: 'Europe/Kyiv', label: 'Kyiv (UTC+2 / UTC+3)' },
  { value: 'America/New_York', label: 'New York / Eastern Time (UTC-5 / UTC-4)' },
  { value: 'America/Chicago', label: 'Chicago / Central Time (UTC-6 / UTC-5)' },
  { value: 'America/Denver', label: 'Denver / Mountain Time (UTC-7 / UTC-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles / Pacific Time (UTC-8 / UTC-7)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Asia/Kolkata', label: 'India / New Delhi (UTC+5:30)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10 / UTC+11)' },
]

function syncFromStore() {
  Object.assign(form, settingsStore.current)
}

watch(
  () => settingsStore.current,
  () => {
    syncFromStore()
  },
  { immediate: true },
)

const isDirty = computed(() => {
  const cur = settingsStore.current
  return (
    form.topImagePrompt !== cur.topImagePrompt ||
    form.topTextLocation !== cur.topTextLocation ||
    form.bottomImagePrompt !== cur.bottomImagePrompt ||
    form.bottomTextLocation !== cur.bottomTextLocation ||
    form.defaultFontSize !== cur.defaultFontSize ||
    form.centerAlign !== cur.centerAlign ||
    form.elephantDescription !== cur.elephantDescription ||
    form.giraffeDescription !== cur.giraffeDescription ||
    form.foxDescription !== cur.foxDescription ||
    form.promptText !== cur.promptText ||
    form.timeZone !== cur.timeZone
  )
})

const savedNotification = ref(false)
const versionHistoryOpen = ref(false)

async function onSave() {
  const payload: AppSettings = {
    topImagePrompt: form.topImagePrompt.trim(),
    topTextLocation: Number(form.topTextLocation) || 700,
    bottomImagePrompt: form.bottomImagePrompt.trim(),
    bottomTextLocation: Number(form.bottomTextLocation) || 0,
    defaultFontSize: Number(form.defaultFontSize) || 24,
    centerAlign: Number(form.centerAlign) || 768,
    elephantDescription: form.elephantDescription.trim(),
    giraffeDescription: form.giraffeDescription.trim(),
    foxDescription: form.foxDescription.trim(),
    promptText: form.promptText.trim(),
    timeZone: form.timeZone || 'Asia/Jerusalem',
  }
  settingsStore.save(payload)
  const committed = await recordsStore.persistSettings(payload, 'settings.json: updated settings')
  if (!committed) {
    recordsStore.toast('Settings saved locally')
  }
  savedNotification.value = true
  setTimeout(() => {
    savedNotification.value = false
  }, 2500)
}

async function onReset() {
  if (confirm('Reset all settings to default values?')) {
    settingsStore.reset()
    syncFromStore()
    await recordsStore.persistSettings(settingsStore.current, 'settings.json: reset to defaults')
    recordsStore.toast('Settings reset to defaults')
  }
}

const appVersion = computed(() => {
  const rawIso = typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : ''
  if (!rawIso) return 'dev'
  try {
    const d = new Date(rawIso)
    if (isNaN(d.getTime())) return rawIso
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: form.timeZone || 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)
    const day = parts.find((p) => p.type === 'day')?.value || ''
    const month = parts.find((p) => p.type === 'month')?.value || ''
    const year = parts.find((p) => p.type === 'year')?.value || ''
    const hour = parts.find((p) => p.type === 'hour')?.value || ''
    const min = parts.find((p) => p.type === 'minute')?.value || ''
    return `${day}/${month}/${year} ${hour}:${min}`
  } catch {
    return rawIso
  }
})
</script>

<template>
  <main data-screen-label="Settings" style="padding: var(--space-1) clamp(16px, 4vw, var(--space-8)) var(--space-8); max-width: 960px">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-2)">
      <h1 style="margin: 0; font-size: clamp(24px, 3vw, 36px)">Settings</h1>

      <div style="display: flex; gap: var(--space-3); align-items: center; flex-shrink: 0">
        <button
          type="button"
          class="version-badge-btn"
          title="Click to view version history and changelog"
          @click="versionHistoryOpen = true"
        >
          <span style="width: 28px; height: 28px; border-radius: 50%; background: var(--color-accent-200); color: var(--color-accent-800); display: grid; place-items: center; font-weight: 700; font-size: 11px">v</span>
          <span>{{ appVersion }}</span>
        </button>
        <button class="btn btn-secondary" @click="onReset">Reset to defaults</button>
        <button class="btn btn-primary" :disabled="!isDirty" @click="onSave">
          <Icon name="check" />Save settings
        </button>
      </div>
    </div>

    <p class="text-muted" style="margin: 0 0 var(--space-6); font-size: 14px">
      General prompt configuration, text positioning, and character profiles for the application.
    </p>

    <form style="display: flex; flex-direction: column; gap: var(--space-6)" @submit.prevent="onSave">
      <!-- Regional & Time Zone Section -->
      <section style="display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-6); border-radius: calc(var(--radius-lg) * 1.2); background: var(--color-surface)">
        <div>
          <h3 style="margin: 0; font-size: 18px">Regional Settings</h3>
          <p class="text-muted" style="margin: 4px 0 0; font-size: 13px">
            Time zone used across all timestamps, version history, and posting schedule.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: var(--space-4)">
          <div class="field">
            <label for="timeZone">Time Zone</label>
            <select
              id="timeZone"
              v-model="form.timeZone"
              class="input"
              style="cursor: pointer; background: var(--color-bg)"
            >
              <option v-for="tz in TIME_ZONES" :key="tz.value" :value="tz.value">
                {{ tz.label }}
              </option>
            </select>
            <span class="text-muted" style="font-size: 12px; margin-top: 6px; display: block">
              Current time in this zone: <b style="color: var(--color-text)">{{ fmt(now(), form.timeZone) }}</b>
            </span>
          </div>
        </div>
      </section>

      <!-- Image & Text Prompts Section -->
      <section style="display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-6); border-radius: calc(var(--radius-lg) * 1.2); background: var(--color-surface)">
        <div>
          <h3 style="margin: 0; font-size: 18px">Image &amp; Text Positioning</h3>
          <p class="text-muted" style="margin: 4px 0 0; font-size: 13px">
            Default prompts and coordinates for generating top and bottom scene images and overlays.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: var(--space-4)">
          <div class="field">
            <label for="topImagePrompt">Top Image prompt</label>
            <input
              id="topImagePrompt"
              v-model="form.topImagePrompt"
              type="text"
              class="input"
              placeholder="e.g. Clean background with bright lighting"
            />
          </div>

          <div class="field">
            <label for="topTextLocation">Top Text Location</label>
            <input
              id="topTextLocation"
              v-model.number="form.topTextLocation"
              type="number"
              class="input"
              placeholder="700"
            />
          </div>

          <div class="field">
            <label for="bottomImagePrompt">Bottom Image prompt</label>
            <input
              id="bottomImagePrompt"
              v-model="form.bottomImagePrompt"
              type="text"
              class="input"
              placeholder="e.g. Reaction shot complementary art"
            />
          </div>

          <div class="field">
            <label for="bottomTextLocation">Bottom Text Location</label>
            <input
              id="bottomTextLocation"
              v-model.number="form.bottomTextLocation"
              type="number"
              class="input"
              placeholder="2300"
            />
          </div>

          <div class="field">
            <label for="defaultFontSize">Default font size</label>
            <input
              id="defaultFontSize"
              v-model.number="form.defaultFontSize"
              type="number"
              class="input"
              placeholder="24"
              min="1"
            />
          </div>

          <div class="field">
            <label for="centerAlign">Center Align</label>
            <input
              id="centerAlign"
              v-model.number="form.centerAlign"
              type="number"
              class="input"
              placeholder="768"
            />
          </div>
        </div>
      </section>

      <!-- Character Descriptions Section -->
      <section style="display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-6); border-radius: calc(var(--radius-lg) * 1.2); background: var(--color-surface)">
        <div>
          <h3 style="margin: 0; font-size: 18px">Character Descriptions</h3>
          <p class="text-muted" style="margin: 4px 0 0; font-size: 13px">
            Visual profiles and persona descriptions for the core characters.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-4)">
          <!-- Elephant -->
          <div class="field">
            <label for="elephantDescription" style="display: flex; align-items: center; gap: var(--space-2)">
              <span
                :style="`width:22px; height:22px; flex:none; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:700; color:#fff; background:${CHARACTER_ICONS.Elephant.bg}`"
              >
                {{ CHARACTER_ICONS.Elephant.glyph }}
              </span>
              The Elephant
            </label>
            <textarea
              id="elephantDescription"
              v-model="form.elephantDescription"
              class="input"
              rows="3"
              style="border-radius: var(--radius-md); min-height: 80px; resize: vertical"
              placeholder="Describe the Elephant character traits, visual features, colors..."
            ></textarea>
          </div>

          <!-- Giraffe -->
          <div class="field">
            <label for="giraffeDescription" style="display: flex; align-items: center; gap: var(--space-2)">
              <span
                :style="`width:22px; height:22px; flex:none; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:700; color:#fff; background:${CHARACTER_ICONS.Giraffe.bg}`"
              >
                {{ CHARACTER_ICONS.Giraffe.glyph }}
              </span>
              The Giraffe Description
            </label>
            <textarea
              id="giraffeDescription"
              v-model="form.giraffeDescription"
              class="input"
              rows="3"
              style="border-radius: var(--radius-md); min-height: 80px; resize: vertical"
              placeholder="Describe the Giraffe character traits, visual features, colors..."
            ></textarea>
          </div>

          <!-- Fox -->
          <div class="field">
            <label for="foxDescription" style="display: flex; align-items: center; gap: var(--space-2)">
              <span
                :style="`width:22px; height:22px; flex:none; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:700; color:#fff; background:${CHARACTER_ICONS.Fox.bg}`"
              >
                {{ CHARACTER_ICONS.Fox.glyph }}
              </span>
              The Fox Description
            </label>
            <textarea
              id="foxDescription"
              v-model="form.foxDescription"
              class="input"
              rows="3"
              style="border-radius: var(--radius-md); min-height: 80px; resize: vertical"
              placeholder="Describe the Fox character traits, visual features, colors..."
            ></textarea>
          </div>
        </div>
      </section>

      <!-- Prompt Text Section -->
      <section style="display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-6); border-radius: calc(var(--radius-lg) * 1.2); background: var(--color-surface)">
        <div>
          <h3 style="margin: 0; font-size: 18px">Prompt Template</h3>
          <p class="text-muted" style="margin: 4px 0 0; font-size: 13px">
            General prompt directives applied when assembling creative scenarios and generation prompts.
          </p>
        </div>

        <div class="field">
          <label for="promptText">Prompt Text</label>
          <textarea
            id="promptText"
            v-model="form.promptText"
            class="input"
            rows="5"
            style="border-radius: var(--radius-md); min-height: 120px; resize: vertical"
            placeholder="Enter general prompt text or template..."
          ></textarea>
        </div>
      </section>

      <!-- Bottom Actions -->
      <div style="display: flex; gap: var(--space-2); justify-content: flex-end; align-items: center">
        <span v-if="savedNotification" class="text-muted" style="font-size: 13px; color: var(--color-accent-2)">
          Changes saved successfully!
        </span>
        <button type="button" class="btn btn-secondary" @click="onReset">Reset</button>
        <button type="submit" class="btn btn-primary" :disabled="!isDirty">
          <Icon name="check" />Save settings
        </button>
      </div>
    </form>

    <VersionHistoryModal :open="versionHistoryOpen" @close="versionHistoryOpen = false" />
  </main>
</template>

<style scoped>
.version-badge-btn {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 13px;
  white-space: nowrap;
  padding: 3px 10px 3px 3px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.version-badge-btn:hover {
  background: var(--color-surface);
  border-color: var(--color-divider);
}
</style>
