<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { SN, ST, type RecStatus, fmt, fmtPostDate, recStatus, recThumb, shown1, short } from '../domain'
import { useRecordsStore } from '../stores/records'
import { useUiStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'

const store = useRecordsStore()
const ui = useUiStore()
const settings = useSettingsStore()
const router = useRouter()

const recs = computed(() => store.visible)
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

type SortCol = 'pilgi' | 'stage' | 'remarks' | 'status' | 'posted' | 'lastModified'
type SortDir = 'asc' | 'desc'

const sortCol = ref<SortCol>('lastModified')
const sortDir = ref<SortDir>('desc')

function toggleSort(col: SortCol) {
  if (sortCol.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCol.value = col
    sortDir.value = col === 'lastModified' || col === 'posted' ? 'desc' : 'asc'
  }
}

const rows = computed(() => {
  const q = ui.q.trim().toLowerCase()
  const filtered = recs.value.filter(
    (r) =>
      (ui.stageF === 'all' || r.currentStage === ui.stageF) &&
      (ui.statusF === 'all' || recStatus(r) === ui.statusF) &&
      (!q || (r.id + ' ' + shown1(r.stage1).topSentence + ' ' + shown1(r.stage1).bottomSentence).toLowerCase().includes(q)),
  )

  const mult = sortDir.value === 'asc' ? 1 : -1

  filtered.sort((a, b) => {
    let cmp = 0
    switch (sortCol.value) {
      case 'pilgi':
        cmp = (a.num || 0) - (b.num || 0)
        break
      case 'stage':
        cmp = a.currentStage - b.currentStage
        break
      case 'remarks':
        cmp = a.remarks.length - b.remarks.length
        break
      case 'status':
        cmp = (ST[recStatus(a)]?.label || '').localeCompare(ST[recStatus(b)]?.label || '')
        break
      case 'posted': {
        const pa = a.stage5.status === 'posted' ? (a.stage5.postedAt || '') : ''
        const pb = b.stage5.status === 'posted' ? (b.stage5.postedAt || '') : ''
        if (!pa && pb) cmp = 1
        else if (pa && !pb) cmp = -1
        else cmp = pa.localeCompare(pb)
        break
      }
      case 'lastModified':
      default:
        cmp = a.lastModifiedAt.localeCompare(b.lastModifiedAt)
        break
    }
    if (cmp !== 0) return cmp * mult
    return b.lastModifiedAt.localeCompare(a.lastModifiedAt)
  })

  return filtered.map((r) => {
    const k = recStatus(r)
    const v1 = shown1(r.stage1)
    const done = (n: number) => n < r.currentStage || (n === 5 && r.stage5.status === 'posted')
    const rc = r.remarks.length
    const inline = (s?: string) => (s ? s.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim() : '')
    return {
      id: r.id,
      top: inline(v1.topSentence),
      bottom: inline(v1.bottomSentence),
      stageNum: r.currentStage,
      stageName: SN[r.currentStage],
      tagCls: ST[k].cls,
      statusLabel: ST[k].label,
      postedAt: r.stage5.status === 'posted' ? fmtPostDate(r.stage5.postedAt, settings.current.timeZone) : '—',
      by: short(r.lastModifiedBy),
      at: fmt(r.lastModifiedAt, settings.current.timeZone),
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
  <main data-screen-label="Records Dashboard" style="padding: var(--space-1) clamp(16px, 4vw, var(--space-8)) var(--space-8)">
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
      <span class="text-muted" style="font-size: 13px; white-space: nowrap">{{ summary }}</span>
      <div style="position: relative; flex: 1 1 220px; min-width: 0; max-width: 340px; margin-left: auto">
        <Icon name="search" :size="15" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); opacity: 0.55; pointer-events: none" />
        <input
          v-model="ui.q"
          class="input"
          placeholder="Search sentences or pilgi id"
          :style="`padding-left: 36px; padding-right: ${ui.q ? '36px' : '14px'}`"
          @keydown.esc="ui.q = ''"
        />
        <button
          v-if="ui.q"
          type="button"
          class="clear-search-btn"
          aria-label="Clear search"
          title="Clear search"
          @click="ui.q = ''"
        >
          <Icon name="x" :size="13" />
        </button>
      </div>
    </div>

    <div style="background: var(--color-neutral-100); border-radius: calc(var(--radius-lg) * 1.15); padding: var(--space-2) var(--space-3); overflow-x: auto">
      <table class="table" style="min-width: 720px">
        <thead>
          <tr>
            <th class="sortable-th" title="Sort by PilGi record number" @click="toggleSort('pilgi')">
              <span class="th-content">
                <span>PilGi</span>
                <span class="sort-icon" :class="{ active: sortCol === 'pilgi' }">
                  <Icon name="chevron" :size="12" :style="sortCol === 'pilgi' && sortDir === 'asc' ? 'transform: rotate(180deg)' : ''" />
                </span>
              </span>
            </th>
            <th class="sortable-th" title="Sort by stage" @click="toggleSort('stage')">
              <span class="th-content">
                <span>Stage</span>
                <span class="sort-icon" :class="{ active: sortCol === 'stage' }">
                  <Icon name="chevron" :size="12" :style="sortCol === 'stage' && sortDir === 'asc' ? 'transform: rotate(180deg)' : ''" />
                </span>
              </span>
            </th>
            <th class="sortable-th" title="Sort by remarks count" @click="toggleSort('remarks')">
              <span class="th-content">
                <span>Remarks</span>
                <span class="sort-icon" :class="{ active: sortCol === 'remarks' }">
                  <Icon name="chevron" :size="12" :style="sortCol === 'remarks' && sortDir === 'asc' ? 'transform: rotate(180deg)' : ''" />
                </span>
              </span>
            </th>
            <th class="sortable-th" title="Sort by status" @click="toggleSort('status')">
              <span class="th-content">
                <span>Status</span>
                <span class="sort-icon" :class="{ active: sortCol === 'status' }">
                  <Icon name="chevron" :size="12" :style="sortCol === 'status' && sortDir === 'asc' ? 'transform: rotate(180deg)' : ''" />
                </span>
              </span>
            </th>
            <th class="sortable-th" title="Sort by posted date" @click="toggleSort('posted')">
              <span class="th-content">
                <span>Posted</span>
                <span class="sort-icon" :class="{ active: sortCol === 'posted' }">
                  <Icon name="chevron" :size="12" :style="sortCol === 'posted' && sortDir === 'asc' ? 'transform: rotate(180deg)' : ''" />
                </span>
              </span>
            </th>
            <th class="sortable-th" title="Sort by last modified date" @click="toggleSort('lastModified')">
              <span class="th-content">
                <span>Last modified</span>
                <span class="sort-icon" :class="{ active: sortCol === 'lastModified' }">
                  <Icon name="chevron" :size="12" :style="sortCol === 'lastModified' && sortDir === 'asc' ? 'transform: rotate(180deg)' : ''" />
                </span>
              </span>
            </th>
          </tr>
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
          {{ store.visible.length ? 'No pilgis match these filters.' : 'This repo has no pilgis yet — create one or import a batch.' }}
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.clear-search-btn {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--color-neutral-600);
  background: transparent;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.clear-search-btn:hover {
  background: var(--color-neutral-300);
  color: var(--color-neutral-900);
}
.sortable-th {
  cursor: pointer;
  user-select: none;
  transition: color 0.15s ease;
}
.sortable-th:hover {
  color: var(--color-neutral-900);
}
.th-content {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.sort-icon {
  display: inline-flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.sortable-th:hover .sort-icon {
  opacity: 0.5;
}
.sort-icon.active {
  opacity: 1;
  color: var(--color-accent);
}
</style>
