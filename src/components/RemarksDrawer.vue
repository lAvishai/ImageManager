<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { SN, fmt, short } from '../domain'
import { useAuthStore } from '../stores/auth'
import { useRecordsStore } from '../stores/records'
import { useUiStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'

const ui = useUiStore()
const auth = useAuthStore()
const store = useRecordsStore()
const settings = useSettingsStore()

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
const rec = computed(() => (ui.remarksFor ? store.byId(ui.remarksFor) : undefined))
const AV = ['var(--color-accent)', 'var(--color-accent-2-600)', 'var(--color-neutral-600)', 'var(--color-accent-800)']

const isDone = computed(() => !!rec.value?.remarksDone)

const latestDoneAt = computed(() => {
  if (!rec.value?.remarksDone) return null
  if (rec.value.remarksDoneHistory?.length) {
    return rec.value.remarksDoneHistory[rec.value.remarksDoneHistory.length - 1].at
  }
  return rec.value.remarksDoneAt || null
})

const hasNewRemarksAfterDone = computed(() => {
  if (!isDone.value || !latestDoneAt.value) return false
  const tDone = new Date(latestDoneAt.value).getTime()
  return (rec.value?.remarks || []).some((m) => new Date(m.at).getTime() > tDone)
})

interface TimelineRemark {
  type: 'remark'
  id: string
  by: string
  at: string
  stage: number
  text: string
  mine: boolean
  name: string
  glyph: string
  avatarBg: string
  stageLabel: string
}

interface TimelineDone {
  type: 'done'
  id: string
  by: string
  at: string
  byName: string
  atFormatted: string
}

type TimelineItem = TimelineRemark | TimelineDone

const feed = computed<TimelineItem[]>(() => {
  const people = [auth.email, ...new Set((rec.value?.remarks || []).map((m) => m.by).filter((b) => b !== auth.email))]
  const remarkItems: TimelineRemark[] = (rec.value?.remarks || []).map((m, idx) => {
    const mine = m.by === auth.email
    const i = Math.max(0, people.indexOf(m.by))
    return {
      type: 'remark',
      id: `rem-${idx}-${m.at}`,
      by: m.by,
      at: m.at,
      stage: m.stage,
      text: m.text,
      mine,
      name: mine ? 'You' : short(m.by),
      glyph: short(m.by).charAt(0).toUpperCase(),
      avatarBg: AV[i % AV.length],
      stageLabel: `Written at Stage ${m.stage} · ${SN[m.stage]}`,
    }
  })

  if (!rec.value?.remarksDone) {
    return remarkItems
  }

  const history = rec.value.remarksDoneHistory?.length
    ? rec.value.remarksDoneHistory
    : rec.value.remarksDoneAt
      ? [{ at: rec.value.remarksDoneAt, by: rec.value.remarksDoneBy || '' }]
      : []

  const doneMarkers: TimelineDone[] = history.map((h, idx) => ({
    type: 'done',
    id: `done-${idx}-${h.at}`,
    by: h.by,
    at: h.at,
    byName: h.by === auth.email ? 'You' : short(h.by) || 'Team',
    atFormatted: fmt(h.at, settings.current.timeZone),
  }))

  const all: TimelineItem[] = [...remarkItems, ...doneMarkers]
  all.sort((a, b) => {
    const ta = new Date(a.at).getTime()
    const tb = new Date(b.at).getTime()
    if (ta !== tb) return ta - tb
    if (a.type !== b.type) return a.type === 'remark' ? -1 : 1
    return 0
  })

  return all
})

watch([() => ui.remarksFor, () => feed.value.length], async () => {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
})
watch(() => ui.remarksFor, () => (draft.value = ''))

async function send() {
  const t = draft.value.trim()
  if (!t || !rec.value) return
  draft.value = ''
  await store.addRemark(rec.value.id, ui.remarksStage, t)
}

async function setDoneStatus(val: boolean) {
  if (!rec.value) return
  await store.setRemarksDone(rec.value.id, val)
}
</script>

<template>
  <template v-if="ui.remarksFor && rec">
    <div style="position: fixed; inset: 0; z-index: 40; background: rgba(32, 30, 29, 0.18)" @click="ui.closeRemarks()"></div>
    <aside data-screen-label="Remarks" style="position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(420px, 100%); display: flex; flex-direction: column; background: var(--color-bg); box-shadow: var(--shadow-lg); border-radius: calc(var(--radius-lg) * 1.4) 0 0 calc(var(--radius-lg) * 1.4)">
      <!-- Header -->
      <div style="display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-6) var(--space-6) var(--space-3)">
        <div style="margin-right: auto">
          <h3 style="margin: 0">Remarks</h3>
          <span class="text-muted" style="font-size: 13px">{{ rec.id }} · not tied to a stage</span>
        </div>
        <button class="btn btn-ghost btn-icon" aria-label="Close remarks" style="width: 36px; height: 36px; padding: 0" @click="ui.closeRemarks()"><Icon name="x" :size="18" /></button>
      </div>

      <!-- Status & Actions bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: 0 var(--space-6) var(--space-3); border-bottom: 1px solid var(--color-divider)">
        <div style="display: flex; align-items: center; gap: var(--space-2); font-size: 13px">
          <span class="text-muted" style="font-weight: 500">Status:</span>
          <span
            v-if="isDone"
            class="tag tag-accent-2"
            style="font-weight: 700; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px"
          >
            <Icon name="check" :size="12" :stroke="3" />
            Done
          </span>
          <span
            v-else
            class="tag tag-neutral"
            style="font-weight: 600; padding: 2px 8px"
          >
            Open
          </span>
          <span
            v-if="isDone && hasNewRemarksAfterDone"
            class="text-muted"
            style="font-size: 11px; font-style: italic"
          >
            (new remarks below)
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: var(--space-2)">
          <button
            v-if="!isDone"
            class="btn btn-secondary"
            style="font-size: 12px; padding: 4px 12px; height: 30px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px"
            @click="setDoneStatus(true)"
          >
            <Icon name="check" :size="13" :stroke="2.5" />
            Mark as Done
          </button>
          <template v-else>
            <button
              v-if="hasNewRemarksAfterDone"
              class="btn btn-primary"
              style="font-size: 12px; padding: 4px 12px; height: 30px; display: inline-flex; align-items: center; gap: 6px; border-radius: 999px"
              title="Mark newly added remarks as done"
              @click="setDoneStatus(true)"
            >
              <Icon name="check" :size="13" :stroke="2.5" />
              Mark as Done
            </button>
            <button
              class="btn btn-ghost"
              style="font-size: 12px; padding: 4px 8px; height: 30px; color: var(--color-neutral-600)"
              title="Reopen remarks status"
              @click="setDoneStatus(false)"
            >
              Reopen
            </button>
          </template>
        </div>
      </div>

      <!-- Remarks / Timeline feed -->
      <div ref="listEl" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-4) var(--space-6)">
        <div v-if="!feed.length" style="margin: auto 0; display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); padding: var(--space-6); border-radius: var(--radius-lg); background: var(--color-surface)">
          <h5 style="margin: 0">No remarks yet</h5>
          <p class="text-muted" style="margin: 0; font-size: 13px; text-wrap: pretty">Notes here stay with the pilgi through every stage. They don't affect reviews or versions.</p>
        </div>

        <template v-for="item in feed" :key="item.id">
          <!-- Done Separating Line -->
          <div
            v-if="item.type === 'done'"
            style="display: flex; align-items: center; gap: var(--space-3); margin: var(--space-1) 0; width: 100%"
          >
            <div style="flex: 1; height: 1px; background: color-mix(in srgb, var(--color-accent-2) 40%, var(--color-divider))"></div>
            <div
              style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 12px; border-radius: 999px; background: var(--color-accent-2-100); border: 1px solid var(--color-accent-2-300); color: var(--color-accent-2-800); font-size: 11px; font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; box-shadow: var(--shadow-sm)"
            >
              <span
                style="width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; background: var(--color-accent-2); color: var(--color-bg)"
              >
                <Icon name="check" :size="10" :stroke="3.5" />
              </span>
              <span>Done · Marked by {{ item.byName }} · {{ item.atFormatted }}</span>
            </div>
            <div style="flex: 1; height: 1px; background: color-mix(in srgb, var(--color-accent-2) 40%, var(--color-divider))"></div>
          </div>

          <!-- Remark Bubble -->
          <div
            v-else
            :style="`display:flex; flex-direction:${item.mine ? 'row-reverse' : 'row'}; align-items:flex-end; gap:var(--space-2)`"
          >
            <span
              :title="item.by"
              :style="`width:30px; height:30px; flex:none; border-radius:50%; display:grid; place-items:center; font-size:12px; font-weight:700; color:var(--color-bg); background:${item.avatarBg}`"
            >{{ item.glyph }}</span>
            <div :style="`max-width:78%; display:flex; flex-direction:column; gap:4px; align-items:${item.mine ? 'flex-end' : 'flex-start'}`">
              <div style="display: flex; gap: var(--space-2); align-items: center; font-size: 12px">
                <b>{{ item.name }}</b>
                <span class="text-muted">{{ fmt(item.at, settings.current.timeZone) }}</span>
              </div>
              <div
                :style="`padding:10px 14px; border-radius:${item.mine ? '18px 18px 6px 18px' : '18px 18px 18px 6px'}; background:${item.mine ? 'var(--color-accent-200)' : 'var(--color-surface)'}; font-size:14px; line-height:1.45; white-space:pre-wrap; text-wrap:pretty`"
              >{{ item.text }}</div>
              <span class="tag tag-outline" style="font-size: 11px">{{ item.stageLabel }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Add Remark Form (Always active) -->
      <form style="display: flex; align-items: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-6) var(--space-6); border-top: 2px solid var(--color-neutral-200)" @submit.prevent="send">
        <textarea v-model="draft" class="input" rows="2" placeholder="Write a remark… (Enter to send)" style="flex: 1; resize: none; border-radius: var(--radius-md); min-height: 48px" @keydown.enter.exact.prevent="send"></textarea>
        <button class="btn btn-primary btn-icon" type="submit" :disabled="!draft.trim()" aria-label="Send remark" style="width: 44px; height: 44px; padding: 0; flex: none"><Icon name="send" :size="18" /></button>
      </form>
    </aside>
  </template>
</template>
