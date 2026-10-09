<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { SN, fmt, short } from '../domain'
import { useAuthStore } from '../stores/auth'
import { useRecordsStore } from '../stores/records'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()
const auth = useAuthStore()
const store = useRecordsStore()

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
const rec = computed(() => (ui.remarksFor ? store.byId(ui.remarksFor) : undefined))
const AV = ['var(--color-accent)', 'var(--color-accent-2-600)', 'var(--color-neutral-600)', 'var(--color-accent-800)']

const items = computed(() => {
  const people = [auth.email, ...new Set((rec.value?.remarks || []).map((m) => m.by).filter((b) => b !== auth.email))]
  return (rec.value?.remarks || []).map((m) => {
    const mine = m.by === auth.email
    const i = Math.max(0, people.indexOf(m.by))
    return {
      ...m,
      mine,
      name: mine ? 'You' : short(m.by),
      glyph: short(m.by).charAt(0).toUpperCase(),
      avatarBg: AV[i % AV.length],
      at: fmt(m.at),
      stageLabel: `Written at Stage ${m.stage} · ${SN[m.stage]}`,
    }
  })
})

watch([() => ui.remarksFor, () => items.value.length], async () => {
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
</script>

<template>
  <template v-if="ui.remarksFor && rec">
    <div style="position: fixed; inset: 0; z-index: 40; background: rgba(32, 30, 29, 0.18)" @click="ui.closeRemarks()"></div>
    <aside data-screen-label="Remarks" style="position: fixed; top: 0; right: 0; bottom: 0; z-index: 41; width: min(420px, 100%); display: flex; flex-direction: column; background: var(--color-bg); box-shadow: var(--shadow-lg); border-radius: calc(var(--radius-lg) * 1.4) 0 0 calc(var(--radius-lg) * 1.4)">
      <div style="display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-6) var(--space-6) var(--space-4)">
        <div style="margin-right: auto">
          <h3 style="margin: 0">Remarks</h3>
          <span class="text-muted" style="font-size: 13px">{{ rec.id }} · not tied to a stage</span>
        </div>
        <button class="btn btn-ghost btn-icon" aria-label="Close remarks" style="width: 36px; height: 36px; padding: 0" @click="ui.closeRemarks()"><Icon name="x" :size="18" /></button>
      </div>
      <div ref="listEl" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-2) var(--space-6) var(--space-4)">
        <div v-if="!items.length" style="margin: auto 0; display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-2); padding: var(--space-6); border-radius: var(--radius-lg); background: var(--color-surface)">
          <h5 style="margin: 0">No remarks yet</h5>
          <p class="text-muted" style="margin: 0; font-size: 13px; text-wrap: pretty">Notes here stay with the pilgi through every stage. They don't affect reviews or versions.</p>
        </div>
        <div v-for="(m, i) in items" :key="i" :style="`display:flex; flex-direction:${m.mine ? 'row-reverse' : 'row'}; align-items:flex-end; gap:var(--space-2)`">
          <span :title="m.by" :style="`width:30px; height:30px; flex:none; border-radius:50%; display:grid; place-items:center; font-size:12px; font-weight:700; color:var(--color-bg); background:${m.avatarBg}`">{{ m.glyph }}</span>
          <div :style="`max-width:78%; display:flex; flex-direction:column; gap:4px; align-items:${m.mine ? 'flex-end' : 'flex-start'}`">
            <div style="display: flex; gap: var(--space-2); align-items: center; font-size: 12px"><b>{{ m.name }}</b><span class="text-muted">{{ m.at }}</span></div>
            <div :style="`padding:10px 14px; border-radius:${m.mine ? '18px 18px 6px 18px' : '18px 18px 18px 6px'}; background:${m.mine ? 'var(--color-accent-200)' : 'var(--color-surface)'}; font-size:14px; line-height:1.45; white-space:pre-wrap; text-wrap:pretty`">{{ m.text }}</div>
            <span class="tag tag-outline" style="font-size: 11px">{{ m.stageLabel }}</span>
          </div>
        </div>
      </div>
      <form style="display: flex; align-items: flex-end; gap: var(--space-2); padding: var(--space-3) var(--space-6) var(--space-6); border-top: 2px solid var(--color-neutral-200)" @submit.prevent="send">
        <textarea v-model="draft" class="input" rows="2" placeholder="Write a remark… (Enter to send)" style="flex: 1; resize: none; border-radius: var(--radius-md); min-height: 48px" @keydown.enter.exact.prevent="send"></textarea>
        <button class="btn btn-primary btn-icon" type="submit" :disabled="!draft.trim()" aria-label="Send remark" style="width: 44px; height: 44px; padding: 0; flex: none"><Icon name="send" :size="18" /></button>
      </form>
    </aside>
  </template>
</template>
