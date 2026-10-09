<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { SN, ST, type RecStatus, fmt, recStatus, recThumb, shown1, short } from '../domain'
import { useRecordsStore } from '../stores/records'
import { useUiStore } from '../stores/ui'

const store = useRecordsStore()
const ui = useUiStore()
const router = useRouter()

const recs = computed(() => store.records)
const pend = (n: number) => `${recs.value.filter((r) => r.currentStage === n && recStatus(r) === 'pending').length} need review`

const tiles = computed(() => {
  const counts = [0, 0, 0, 0, 0, 0]
  recs.value.forEach((r) => counts[r.currentStage]++)
  const sub = [
    '',
    pend(1),
    pend(2),
    `${recs.value.filter((r) => r.currentStage === 3 && recStatus(r) !== 'pending').length} need an image`,
    pend(4),
    `${recs.value.filter((r) => r.stage5.status === 'posted' && r.currentStage === 5).length} posted`,
  ]
  const statusesFor = (k: number) => {
    const m: Partial<Record<RecStatus, number>> = {}
    recs.value.filter((r) => r.currentStage === k).forEach((r) => { const s = recStatus(r); m[s] = (m[s] || 0) + 1 })
    return (Object.keys(ST) as RecStatus[]).filter((s) => m[s]).map((s) => ({ label: ST[s].label, n: m[s]! }))
  }
  return (['all', 1, 2, 3, 4, 5] as const).map((k) => {
    const active = ui.stageF === k
    const statuses = k === 'all' ? [] : statusesFor(k)
    return {
      k,
      statuses,
      noStatuses: k !== 'all' && !statuses.length,
      n: k === 'all' ? '∗' : k,
      label: k === 'all' ? 'All PilGis' : SN[k],
      sub: k === 'all' ? 'Across every stage' : sub[k],
      count: k === 'all' ? recs.value.length : counts[k],
      bg: active ? 'var(--color-surface)' : 'var(--color-neutral-100)',
      shadow: active ? 'var(--shadow-md)' : 'none',
      dot: k === 'all' ? 'var(--color-neutral-700)' : active ? 'var(--color-accent)' : 'var(--color-accent-2)',
    }
  })
})

const statusOpts = [
  ['all', 'All'],
  ['pending', 'Needs review'],
  ['rejected', 'Rejected'],
  ['awaiting', 'Awaiting upload'],
  ['ready', 'Ready to post'],
  ['posted', 'Posted'],
]

const rows = computed(() => {
  const q = ui.q.trim().toLowerCase()
  return recs.value
    .filter(
      (r) =>
        (ui.stageF === 'all' || r.currentStage === ui.stageF) &&
        (ui.statusF === 'all' || recStatus(r) === ui.statusF) &&
        (!q || (r.id + ' ' + shown1(r.stage1).topSentence + ' ' + shown1(r.stage1).bottomSentence).toLowerCase().includes(q)),
    )
    .sort((a, b) => b.lastModifiedAt.localeCompare(a.lastModifiedAt))
    .map((r) => {
      const k = recStatus(r)
      const v1 = shown1(r.stage1)
      const done = (n: number) => n < r.currentStage || (n === 5 && r.stage5.status === 'posted')
      const rc = r.remarks.length
      return {
        id: r.id,
        top: v1.topSentence,
        bottom: v1.bottomSentence,
        stageNum: r.currentStage,
        stageName: SN[r.currentStage],
        tagCls: ST[k].cls,
        statusLabel: ST[k].label,
        postedAt: r.stage5.status === 'posted' ? fmt(r.stage5.postedAt) : '—',
        by: short(r.lastModifiedBy),
        at: fmt(r.lastModifiedAt),
        hasThumb: !!recThumb(r),
        dots: [1, 2, 3, 4, 5].map((n) => (done(n) ? 'var(--color-accent-2)' : n === r.currentStage ? 'var(--color-accent)' : 'var(--color-neutral-300)')),
        rc,
        remarksTitle: rc > 0 ? `${rc} remark${rc === 1 ? '' : 's'}` : 'Add a remark',
        currentStage: r.currentStage,
      }
    })
})

const summary = computed(() => `${recs.value.length} pilgis · ${recs.value.filter((r) => recStatus(r) === 'pending').length} waiting on review`)
</script>

<template>
  <main data-screen-label="Records Dashboard" style="padding: var(--space-4) clamp(16px, 4vw, var(--space-8)) var(--space-8)">
    <p class="text-muted" style="margin: 0 0 var(--space-3); font-size: 13px">{{ summary }}</p>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); gap: var(--space-3); margin-bottom: var(--space-6)">
      <button
        v-for="t in tiles"
        :key="t.k"
        :style="`all:unset; cursor:pointer; display:flex; flex-direction:column; gap:var(--space-2); padding:var(--space-4); border-radius:calc(var(--radius-lg) * 1.15); background:${t.bg}; box-shadow:${t.shadow}`"
        @click="((ui.stageF = t.k), (ui.statusF = 'all'))"
      >
        <span style="display: flex; align-items: center; justify-content: space-between">
          <span :style="`height:30px; padding:0 12px; border-radius:999px; display:inline-flex; align-items:center; gap:6px; background:${t.dot}; color:var(--color-bg); font-size:13px; font-weight:600; white-space:nowrap`">
            <span style="font-family: var(--font-heading); font-size: 14px">{{ t.n }}</span><span>{{ t.label }}</span>
          </span>
          <span style="font-family: var(--font-heading); font-size: 30px; line-height: 1">{{ t.count }}</span>
        </span>
        <span style="display: flex; flex-direction: column; gap: 2px">
          <span v-for="x in t.statuses" :key="x.label" class="text-muted" style="display: flex; justify-content: space-between; gap: var(--space-2); font-size: 12px">
            <span>{{ x.label }}</span><span style="font-weight: 600">{{ x.n }}</span>
          </span>
          <span v-if="t.noStatuses" class="text-muted" style="font-size: 12px">No pilgis</span>
        </span>
      </button>
    </div>

    <div style="display: flex; gap: var(--space-3); align-items: center; flex-wrap: wrap; margin-bottom: var(--space-3)">
      <div class="seg">
        <label v-for="[k, label] in statusOpts" :key="k" class="seg-opt">
          <input v-model="ui.statusF" type="radio" name="statusf" :value="k" />{{ label }}
        </label>
      </div>
      <div style="position: relative; flex: 1 1 220px; min-width: 0; max-width: 340px; margin-left: auto">
        <Icon name="search" :size="15" style="position: absolute; left: 14px; top: 11px; opacity: 0.55" />
        <input v-model="ui.q" class="input" placeholder="Search sentences or pilgi id" style="padding-left: 36px" />
      </div>
    </div>

    <div style="background: var(--color-neutral-100); border-radius: calc(var(--radius-lg) * 1.15); padding: var(--space-2) var(--space-3); overflow-x: auto">
      <table class="table" style="min-width: 720px">
        <thead>
          <tr><th>PilGi</th><th>Stage</th><th>Remarks</th><th>Status</th><th>Posted</th><th>Last modified</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" style="cursor: pointer" @click="router.push(`/record/${row.id}`)">
            <td>
              <div style="display: flex; align-items: center; gap: var(--space-3); padding-block: 4px">
                <span v-if="row.hasThumb" title="Image uploaded" style="width: 36px; height: 36px; flex: none; border-radius: 50%; display: grid; place-items: center; background: var(--color-accent-2-200); color: var(--color-accent-2-800)">
                  <Icon name="image" :size="18" />
                </span>
                <div style="min-width: 0">
                  <div style="font-weight: 600; line-height: 1.3">{{ row.top }}</div>
                  <div style="font-weight: 600; line-height: 1.3">{{ row.bottom }}</div>
                  <div style="font-size: 11px; color: var(--color-neutral-600); margin-top: 2px">{{ row.id }}</div>
                </div>
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 5px">
                <span style="font-size: 13px; white-space: nowrap">{{ row.stageNum }} · {{ row.stageName }}</span>
                <span style="display: flex; gap: 4px">
                  <span v-for="(bg, i) in row.dots" :key="i" :style="`width:18px; height:6px; border-radius:999px; background:${bg}`"></span>
                </span>
              </div>
            </td>
            <td @click.stop>
              <button
                :title="row.remarksTitle"
                :aria-label="row.remarksTitle"
                :style="`all:unset; cursor:pointer; min-width:34px; height:30px; padding:0 10px; box-sizing:border-box; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; gap:5px; font-size:13px; font-weight:700; background:${row.rc > 0 ? 'var(--color-accent-200)' : 'var(--color-neutral-200)'}; color:${row.rc > 0 ? 'var(--color-accent-800)' : 'var(--color-neutral-700)'}`"
                @click.stop="ui.openRemarks(row.id, row.currentStage)"
              >
                <Icon v-if="row.rc > 0" name="chat" :size="13" />
                <span>{{ row.rc > 0 ? row.rc : '+' }}</span>
              </button>
            </td>
            <td><span class="tag" :class="row.tagCls" style="white-space: nowrap">{{ row.statusLabel }}</span></td>
            <td style="font-size: 13px; white-space: nowrap">{{ row.postedAt }}</td>
            <td style="font-size: 13px; white-space: nowrap">
              <div>{{ row.by }}</div>
              <div class="text-muted" style="font-size: 12px">{{ row.at }}</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!rows.length" style="padding: var(--space-8) var(--space-4)">
        <h4 style="margin: 0 0 4px">Nothing here</h4>
        <p class="text-muted" style="margin: 0">
          {{ store.records.length ? 'No pilgis match these filters.' : 'This repo has no pilgis yet — create one or import a batch.' }}
        </p>
      </div>
    </div>
  </main>
</template>
