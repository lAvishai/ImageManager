<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import Thumb from '../components/Thumb.vue'
import ReviewDialog from '../components/ReviewDialog.vue'
import {
  CHARACTER_ICONS,
  SN,
  ST,
  approvedIn,
  fmt,
  last,
  shown1,
  short,
  stageData,
  thumb,
} from '../domain'
import { useRecordsStore } from '../stores/records'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const router = useRouter()
const store = useRecordsStore()
const ui = useUiStore()

const r = computed(() => store.byId(String(route.params.id)))

const active = ref(1)
const viewVn = reactive<Record<number, number | undefined>>({})
const editor = ref<{ mode: 'edit' | 'new'; vn?: number; top: string; bottom: string; scenario: string } | null>(null)
const imgUpdate = ref(false)
const linkDraft = ref('')
const linkError = ref('')
const dateDraft = ref<string | null>(null)
const charOpen = ref<number | null>(null)
const dialog = ref<{ stage: number; vn: number } | null>(null)

// Reset local state whenever a different record is opened
watch(
  () => route.params.id,
  () => {
    const rec = r.value
    active.value = rec ? rec.currentStage : 1
    Object.keys(viewVn).forEach((k) => delete viewVn[Number(k)])
    editor.value = null
    imgUpdate.value = false
    linkDraft.value = linkError.value = ''
    dateDraft.value = null
  },
  { immediate: true },
)

const a = active
const rec = computed(() => r.value!)
const v1 = computed(() => shown1(rec.value.stage1))

const steps = computed(() =>
  [1, 2, 3, 4, 5].map((n) => {
    const x = rec.value
    const locked = n > x.currentStage
    const done = n < x.currentStage || (n === 5 && x.stage5.status === 'posted')
    const isActive = n === a.value
    let sub = 'Locked'
    if (!locked) {
      if (n < 5) {
        const st = stageData(x, n)
        const l = last(st)
        sub = done ? `Approved · v${st.selectedVersionNumber}` : l ? `${ST[l.status].label} · v${l.versionNumber}` : n === 2 ? 'Not written yet' : 'Awaiting upload'
      } else sub = x.stage5.status === 'posted' ? 'Posted ' + fmt(x.stage5.postedAt).split(',')[0] : 'Ready to post'
    }
    return {
      n, name: SN[n], sub, locked, done,
      bg: isActive ? 'var(--color-bg)' : 'transparent',
      shadow: isActive ? 'var(--shadow-md)' : 'none',
      circle: done ? 'var(--color-accent-2)' : locked ? 'var(--color-neutral-400)' : 'var(--color-accent)',
    }
  }),
)

const isLocked = computed(() => a.value > rec.value.currentStage)
const isReview = computed(() => !isLocked.value && a.value < 5)
const isPosting = computed(() => a.value === 5 && !isLocked.value)
const st = computed(() => (a.value < 5 ? stageData(rec.value, a.value) : null))
const vnSel = computed(() => (st.value ? (viewVn[a.value] ?? last(st.value)?.versionNumber ?? null) : null))
const V = computed(() => st.value?.versions.find((x) => x.versionNumber === vnSel.value))
const isCur = computed(() => a.value === rec.value.currentStage)
const stageApproved = computed(() => (st.value ? approvedIn(st.value) : false))
const open = computed(() => isCur.value || (a.value <= 4 && stageApproved.value))
const textStage = computed(() => a.value <= 2)

const vv = computed(() => {
  const v = V.value
  if (!v || !st.value) return null
  const s = st.value, n = a.value
  const owner = n <= 2 ? v.createdBy : v.uploadedBy
  const lastV = last(s)!
  const newBase = () => ({ mode: 'new' as const, top: lastV.topSentence || '', bottom: lastV.bottomSentence || '', scenario: lastV.scenario || '' })
  return {
    v,
    label: `Version ${v.versionNumber}`,
    isFinal: s.selectedVersionNumber === v.versionNumber,
    byLine: `${n <= 2 ? 'Written' : 'Uploaded'} by ${short(owner)} · ${fmt(n <= 2 ? v.createdAt : v.uploadedAt)}`,
    hasReview: v.status !== 'pending',
    reviewLine: `${v.status === 'approved' ? 'Approved' : 'Rejected'} by ${short(v.reviewedBy)} · ${fmt(v.reviewedAt)}`,
    comment: v.reviewComments || 'No comment.',
    commentBg: v.status === 'rejected' ? 'var(--color-accent-100)' : 'var(--color-accent-2-100)',
    link: v.imageLink || v.driveLink || '',
    thumb: n > 2 ? thumb(rec.value.num, n, v.versionNumber) : null,
    canReview: v.status === 'pending' && open.value,
    approveLabel: n === 1 ? 'Approve text' : n === 2 ? 'Approve scenario' : 'Approve & select as final',
    canEdit: n <= 2 && v.status === 'pending' && open.value && !editor.value,
    editLabel: n === 1 ? 'Edit text' : 'Edit scenario',
    canNew: n <= 2 && isCur.value && !stageApproved.value && lastV.status === 'rejected' && !editor.value,
    canUpdate: n <= 4 && stageApproved.value && !(n > 2 && imgUpdate.value) && lastV.status !== 'pending' && !editor.value,
    updateLabel: n === 1 ? 'Update text' : n === 2 ? 'Update scenario' : n === 3 ? 'Update clean image' : 'Update image with text',
    startEdit: () => (editor.value = { mode: 'edit', vn: v.versionNumber, top: v.topSentence || '', bottom: v.bottomSentence || '', scenario: v.scenario || '' }),
    startNew: () => (editor.value = newBase()),
    startUpdate: () => {
      if (n > 2) { imgUpdate.value = true; linkDraft.value = linkError.value = '' }
      else editor.value = newBase()
    },
  }
})

const showCaption = computed(() => a.value === 1 && !!V.value && !editor.value)
const showScenario = computed(() => a.value === 2 && !!V.value && !editor.value)
const showScenarioEmpty = computed(() => a.value === 2 && !V.value && !editor.value && !isLocked.value)
const showEditor = computed(() => a.value <= 2 && !!editor.value)
const showImage = computed(() => a.value > 2 && !!V.value)
const showEmpty = computed(() => a.value > 2 && !V.value)
const emptyMsg = computed(() =>
  a.value === 3
    ? 'Generate the clean, text-free image and paste its Drive link to create version 1.'
    : 'Apply the caption to the approved clean image and paste the Drive link to create version 1.',
)
const lastPending = computed(() => !!(st.value && last(st.value)?.status === 'pending'))
const canAdd = computed(() => a.value > 2 && a.value < 5 && !lastPending.value && ((isCur.value && !stageApproved.value) || (stageApproved.value && imgUpdate.value)))

const versions = computed(() => {
  if (!st.value) return []
  const s = st.value
  return s.versions
    .slice()
    .reverse()
    .map((x) => ({
      label: `v${x.versionNumber}`,
      vn: x.versionNumber,
      tagCls: ST[x.status].cls,
      statusLabel: s.selectedVersionNumber === x.versionNumber ? 'Final' : ST[x.status].label,
      byLine: `${short(a.value <= 2 ? x.createdBy : x.uploadedBy)} · ${fmt(a.value <= 2 ? x.createdAt : x.uploadedAt)}`,
      comment: x.reviewComments,
      reviewer: short(x.reviewedBy),
      thumb: a.value > 2 ? thumb(rec.value.num, a.value, x.versionNumber) : null,
      bg: x.versionNumber === vnSel.value ? 'var(--color-surface)' : 'var(--color-neutral-100)',
      ring: x.versionNumber === vnSel.value ? '2px solid var(--color-accent)' : 'none',
    }))
})
const listTitle = computed(() => (a.value <= 2 ? 'Version history' : a.value === 3 ? 'Version gallery' : 'Review history'))

function goStage(n: number) {
  active.value = n
  editor.value = null
  linkDraft.value = linkError.value = ''
}
function pickVersion(vn: number) {
  viewVn[a.value] = vn
  editor.value = null
}

async function approve() {
  const v = V.value!, stage = a.value, wasCur = rec.value.currentStage === stage
  await store.review(rec.value.id, 'approve', stage, v.versionNumber, '')
  active.value = wasCur ? Math.min(stage + 1, 5) : stage
  Object.keys(viewVn).forEach((k) => delete viewVn[Number(k)])
  editor.value = null
}
async function onReject(comment: string) {
  const d = dialog.value!
  dialog.value = null
  await store.review(rec.value.id, 'reject', d.stage, d.vn, comment)
}
async function saveEditor() {
  const e = editor.value!
  const stage = a.value as 1 | 2
  editor.value = null
  Object.keys(viewVn).forEach((k) => delete viewVn[Number(k)])
  await store.saveText(rec.value.id, stage, e)
}
const editorInvalid = computed(() => {
  const e = editor.value
  if (!e) return true
  return a.value === 1 ? !(e.top.trim() && e.bottom.trim()) : !e.scenario.trim()
})

async function addImage() {
  const link = linkDraft.value.trim()
  if (!/^https?:\/\/\S+$/.test(link)) {
    linkError.value = 'Paste a full link, e.g. https://drive.google.com/file/d/…'
    return
  }
  const stage = a.value
  imgUpdate.value = false
  linkDraft.value = linkError.value = ''
  viewVn[stage] = undefined
  await store.addImage(rec.value.id, stage, link)
}

// Characters
const pickers = computed(() =>
  [0, 1].map((k) => {
    const val = (rec.value.characters || [])[k] || ''
    const mk = (n: string) => ({ name: n, ...CHARACTER_ICONS[n] })
    return {
      k,
      label: k ? 'Character B:' : 'Character A:',
      cur: val ? mk(val) : { name: 'Choose…', glyph: '?', bg: '#aaa' },
      opts: Object.keys(CHARACTER_ICONS).map((n) => ({ ...mk(n), sel: n === val })),
    }
  }),
)
function pickChar(k: number, n: string) {
  charOpen.value = null
  store.setCharacter(rec.value.id, k, n)
}

// Posting
const fin = computed(() => rec.value.stage4.versions.find((x) => x.status === 'approved'))
const posted = computed(() => rec.value.stage5.status === 'posted')
function editDate() {
  dateDraft.value = rec.value.stage5.postedAt ? rec.value.stage5.postedAt.slice(0, 16) : ''
}
async function saveDate() {
  const v = dateDraft.value
  if (!v) return
  dateDraft.value = null
  await store.setPostDate(rec.value.id, new Date(v + ':00Z').toISOString())
}

const dialogProps = computed(() => (dialog.value ? { title: `Reject version ${dialog.value.vn}` } : null))
</script>

<template>
  <main v-if="r" data-screen-label="Record Detail" style="padding: var(--space-4) clamp(16px, 4vw, var(--space-8)) var(--space-8)">
    <div style="display: flex; gap: var(--space-6); align-items: flex-end; flex-wrap: wrap; margin-bottom: var(--space-6)">
      <div style="flex: 1 1 0; min-width: 200px; max-width: 720px; margin-right: auto; align-self: flex-start">
        <h2 style="margin: 0; font-size: clamp(15px, 2vw, 34px); text-wrap: balance">{{ v1.topSentence }}</h2>
        <h2 style="margin: 4px 0 0; font-size: clamp(15px, 2vw, 34px); text-wrap: balance">{{ v1.bottomSentence }}</h2>
        <span class="tag tag-neutral">{{ r.id }}</span>
        <span class="text-muted" style="font-size: 12px"> Created by {{ short(r.createdBy) }} · {{ fmt(r.createdAt) }}</span>
      </div>
      <button class="btn btn-secondary" style="align-self: flex-start; display: flex; align-items: center; gap: var(--space-2)" @click="ui.openRemarks(r.id, a)">
        <Icon name="chat" />
        Remarks
        <span style="min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; display: inline-grid; place-items: center; background: var(--color-accent); color: var(--color-bg); font-size: 12px; font-weight: 700">{{ r.remarks.length }}</span>
      </button>
      <div style="display: flex; flex-direction: column; gap: var(--space-2); align-self: flex-start; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--color-surface); font-size: 13px">
        <div v-for="pk in pickers" :key="pk.k" style="display: flex; align-items: center; gap: var(--space-2); position: relative">
          <span style="width: 92px; flex: none">{{ pk.label }}</span>
          <button class="input" style="display: flex; align-items: center; gap: var(--space-2); padding: 5px 10px 5px 6px; min-width: 150px; background: var(--color-bg); cursor: pointer; text-align: left" @click="charOpen = charOpen === pk.k ? null : pk.k">
            <span :style="`width:24px; height:24px; flex:none; border-radius:50%; display:grid; place-items:center; font-size:12px; font-weight:700; color:#fff; background:${pk.cur.bg}`">{{ pk.cur.glyph }}</span>
            <span style="flex: 1">{{ pk.cur.name }}</span>
            <Icon name="chevron" :size="14" :stroke="2" />
          </button>
          <div v-if="charOpen === pk.k" style="position: absolute; top: calc(100% + 4px); left: 100px; right: 0; z-index: 30; display: flex; flex-direction: column; padding: 4px; border-radius: var(--radius-md); background: var(--color-bg); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14); border: 1px solid var(--color-divider)">
            <button v-for="o in pk.opts" :key="o.name" :style="`display:flex; align-items:center; gap:var(--space-2); padding:6px 8px; border:0; border-radius:var(--radius-sm); background:${o.sel ? 'var(--color-surface)' : 'transparent'}; font:inherit; color:inherit; cursor:pointer; text-align:left`" @click="pickChar(pk.k, o.name)">
              <span :style="`width:24px; height:24px; flex:none; border-radius:50%; display:grid; place-items:center; font-size:12px; font-weight:700; color:#fff; background:${o.bg}`">{{ o.glyph }}</span>
              <span>{{ o.name }}</span>
            </button>
          </div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 2px; align-self: flex-start; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); background: var(--color-surface); font-size: 13px">
        <span class="text-muted" style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase">Last modified</span>
        <span><b>{{ r.lastModifiedBy }}</b> · {{ fmt(r.lastModifiedAt) }}</span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(5, minmax(150px, 1fr)); gap: var(--space-2); padding: var(--space-2); border-radius: 999px; overflow-x: auto; scrollbar-width: none; background: var(--color-neutral-200); margin-bottom: var(--space-6)">
      <button v-for="s in steps" :key="s.n" :disabled="s.locked" :style="`all:unset; cursor:${s.locked ? 'not-allowed' : 'pointer'}; display:flex; align-items:center; gap:var(--space-3); padding:var(--space-2) var(--space-3); border-radius:999px; background:${s.bg}; box-shadow:${s.shadow}; opacity:${s.locked ? 0.55 : 1}`" @click="!s.locked && goStage(s.n)">
        <span :style="`width:34px; height:34px; flex:none; border-radius:50%; display:grid; place-items:center; background:${s.circle}; color:var(--color-bg); font-family:var(--font-heading); font-size:15px`">
          <Icon v-if="s.done" name="check" :stroke="3" />
          <template v-else>{{ s.n }}</template>
        </span>
        <span style="min-width: 0">
          <span style="display: block; font-family: var(--font-heading); font-size: 15px; line-height: 1.2">{{ s.name }}</span>
          <span style="display: block; font-size: 12px; color: var(--color-neutral-700)">{{ s.sub }}</span>
        </span>
      </button>
    </div>

    <div v-if="isLocked" style="padding: var(--space-8); border-radius: calc(var(--radius-lg) * 1.3); background: var(--color-neutral-100); max-width: 560px">
      <h3 style="margin: 0 0 var(--space-2)">Locked for now</h3>
      <p class="text-muted" style="margin: 0 0 var(--space-4)">{{ SN[a] }} opens once Stage {{ r.currentStage }} · {{ SN[r.currentStage] }} is approved.</p>
      <button class="btn btn-secondary" @click="goStage(r.currentStage)">Go to current stage</button>
    </div>

    <div v-if="isReview" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: var(--space-6); align-items: start">
      <div style="display: flex; flex-direction: column; gap: var(--space-4)">
        <div v-if="showCaption && vv" style="display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-6); min-height: 320px; padding: clamp(20px, 4vw, var(--space-8)); border-radius: calc(var(--radius-lg) * 1.4); background: var(--color-accent-2-200)">
          <div style="font-family: var(--font-heading); font-size: 28px; line-height: 1.15; text-wrap: balance; text-align: center">{{ vv.v.topSentence }}</div>
          <div style="font-family: var(--font-heading); font-size: 28px; line-height: 1.15; text-wrap: balance; text-align: center">{{ vv.v.bottomSentence }}</div>
        </div>
        <div v-if="showScenario && vv" style="display: flex; flex-direction: column; gap: var(--space-4); min-height: 320px; padding: clamp(20px, 4vw, var(--space-8)); border-radius: calc(var(--radius-lg) * 1.4); background: var(--color-accent-100)">
          <span class="tag tag-neutral" style="align-self: flex-start">Scenario</span>
          <div style="font-size: 22px; line-height: 1.45; color: var(--color-accent-900); text-wrap: pretty; max-width: 620px">{{ vv.v.scenario }}</div>
          <div class="text-muted" style="margin-top: auto; font-size: 13px">For “{{ v1.topSentence }} / {{ v1.bottomSentence }}”</div>
        </div>
        <div v-if="showScenarioEmpty" style="min-height: 300px; border-radius: calc(var(--radius-lg) * 1.4); border: 2px dashed var(--color-divider); display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: var(--space-8); gap: var(--space-3)">
          <h3 style="margin: 0">No scenario yet</h3>
          <p class="text-muted" style="margin: 0; max-width: 380px">Describe the scene the image should show. It goes to review like the text.</p>
          <button class="btn btn-primary" @click="editor = { mode: 'new', top: '', bottom: '', scenario: '' }">Write scenario</button>
        </div>
        <div v-if="showEditor && editor && st" style="display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-6); border-radius: calc(var(--radius-lg) * 1.4); background: var(--color-surface)">
          <h4 style="margin: 0">{{ editor.mode === 'edit' ? `Edit version ${editor.vn}` : `Version ${st.versions.length + 1}` }}</h4>
          <template v-if="a === 1">
            <div class="field"><label>Top sentence</label><input v-model="editor.top" class="input" /></div>
            <div class="field"><label>Bottom sentence</label><input v-model="editor.bottom" class="input" /></div>
          </template>
          <div v-else class="field">
            <label>Scenario description</label>
            <textarea v-model="editor.scenario" class="input" style="border-radius: var(--radius-md); min-height: 140px"></textarea>
          </div>
          <div style="display: flex; gap: var(--space-2); justify-content: flex-end">
            <button class="btn btn-ghost" @click="editor = null">Cancel</button>
            <button class="btn btn-primary" :disabled="editorInvalid" @click="saveEditor">{{ editor.mode === 'edit' ? 'Update' : 'Submit for review' }}</button>
          </div>
        </div>
        <template v-if="showImage && vv && vv.thumb">
          <div style="aspect-ratio: 4 / 3; border-radius: calc(var(--radius-lg) * 1.4); overflow: hidden" class="washed">
            <Thumb v-bind="vv.thumb" />
          </div>
          <div style="display: flex; gap: var(--space-2); align-items: center; padding: 6px 6px 6px 16px; border-radius: 999px; background: var(--color-surface)">
            <Icon name="link" :size="15" style="flex: none; opacity: 0.6" />
            <span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px">{{ vv.link }}</span>
            <a class="btn btn-secondary" :href="vv.link" target="_blank" rel="noreferrer" style="padding-block: 6px">Open in Drive</a>
          </div>
        </template>
        <div v-if="showEmpty" style="min-height: 300px; border-radius: calc(var(--radius-lg) * 1.4); border: 2px dashed var(--color-divider); display: flex; flex-direction: column; justify-content: center; padding: var(--space-8); gap: var(--space-2)">
          <h3 style="margin: 0">No image yet</h3>
          <p class="text-muted" style="margin: 0; max-width: 380px">{{ emptyMsg }}</p>
        </div>

        <div v-if="vv && !editor" style="display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) var(--space-4) var(--space-4) var(--space-6); border-radius: calc(var(--radius-lg) * 1.15); background: var(--color-neutral-100)">
          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap">
            <span style="font-family: var(--font-heading); font-size: 18px">{{ vv.label }}</span>
            <span class="tag" :class="ST[vv.v.status].cls">{{ ST[vv.v.status].label }}</span>
            <span v-if="vv.isFinal" class="tag tag-accent-2">Selected as final</span>
            <span class="text-muted" style="font-size: 12px; margin-left: auto">{{ vv.byLine }}</span>
          </div>
          <div v-if="vv.hasReview" :style="`display:flex; flex-direction:column; gap:2px; padding:var(--space-3) var(--space-4); border-radius:var(--radius-md); background:${vv.commentBg}`">
            <span style="font-size: 12px; color: var(--color-neutral-700)">{{ vv.reviewLine }}</span>
            <span style="font-size: 14px">{{ vv.comment }}</span>
          </div>
          <div style="display: flex; gap: var(--space-2); flex-wrap: wrap">
            <template v-if="vv.canReview">
              <button class="btn btn-primary" @click="approve"><Icon name="check" />{{ vv.approveLabel }}</button>
              <button class="btn btn-secondary" @click="dialog = { stage: a, vn: vv.v.versionNumber }"><Icon name="x" />Reject</button>
            </template>
            <button v-if="vv.canEdit" class="btn btn-ghost" @click="vv.startEdit">{{ vv.editLabel }}</button>
            <button v-if="vv.canNew" class="btn btn-primary" @click="vv.startNew">Write new version</button>
            <button v-if="vv.canUpdate" class="btn btn-secondary" title="Creates a new version for review; the approved version stays final until the new one is approved" @click="vv.startUpdate">{{ vv.updateLabel }}</button>
          </div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: var(--space-4)">
        <div v-if="canAdd" style="display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) var(--space-4) var(--space-4) var(--space-6); border-radius: calc(var(--radius-lg) * 1.15); background: var(--color-accent-100)">
          <div>
            <h5 style="margin: 0 0 2px">{{ st && st.versions.length ? `Upload version ${st.versions.length + 1}` : 'Upload version 1' }}</h5>
            <p class="text-muted" style="margin: 0; font-size: 13px">
              {{ stageApproved ? 'The approved image stays final until this new version is approved.' : 'Every link is kept as its own version — nothing is overwritten.' }}
            </p>
          </div>
          <div style="display: flex; gap: var(--space-2)">
            <input v-model="linkDraft" class="input" placeholder="https://drive.google.com/file/d/…" style="background: var(--color-bg)" @input="linkError = ''" @keydown.enter="addImage" />
            <button v-if="stageApproved && imgUpdate" class="btn btn-ghost" style="flex: none" @click="((imgUpdate = false), (linkDraft = linkError = ''))">Cancel</button>
            <button class="btn btn-primary" style="flex: none" @click="addImage">Add</button>
          </div>
          <span v-if="linkError" style="font-size: 12px; color: var(--color-accent-700)">{{ linkError }}</span>
        </div>

        <div style="display: flex; align-items: baseline; justify-content: space-between">
          <h4 style="margin: 0">{{ listTitle }}</h4>
          <span class="text-muted" style="font-size: 13px">{{ st ? `${st.versions.length} total` : '' }}</span>
        </div>

        <div v-if="a === 3 && versions.length" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); gap: var(--space-3)">
          <button v-for="v in versions" :key="v.vn" :style="`all:unset; cursor:pointer; display:flex; flex-direction:column; gap:6px; padding:6px; border-radius:var(--radius-lg); background:${v.bg}; outline:${v.ring}; outline-offset:-2px`" @click="pickVersion(v.vn)">
            <div style="position: relative; aspect-ratio: 4 / 3; border-radius: 22px; overflow: hidden" class="washed"><Thumb v-if="v.thumb" v-bind="v.thumb" /></div>
            <div style="display: flex; align-items: center; gap: 6px; padding: 0 6px 4px">
              <span style="font-family: var(--font-heading); font-size: 14px; margin-right: auto">{{ v.label }}</span>
              <span class="tag" :class="v.tagCls">{{ v.statusLabel }}</span>
            </div>
          </button>
        </div>

        <div v-if="a !== 3 && versions.length" style="display: flex; flex-direction: column; gap: var(--space-2)">
          <button v-for="v in versions" :key="v.vn" :style="`all:unset; cursor:pointer; display:flex; gap:var(--space-3); padding:var(--space-3) var(--space-4); border-radius:var(--radius-lg); background:${v.bg}; outline:${v.ring}; outline-offset:-2px`" @click="pickVersion(v.vn)">
            <div v-if="v.thumb" style="width: 64px; height: 48px; flex: none; border-radius: 12px; overflow: hidden"><Thumb v-bind="v.thumb" /></div>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px">
              <div style="display: flex; align-items: center; gap: 6px">
                <span style="font-family: var(--font-heading); font-size: 14px; margin-right: auto">{{ v.label }}</span>
                <span class="tag" :class="v.tagCls">{{ v.statusLabel }}</span>
              </div>
              <span class="text-muted" style="font-size: 12px">{{ v.byLine }}</span>
              <span v-if="v.comment" style="font-size: 13px; line-height: 1.4">“{{ v.comment }}” <span class="text-muted">— {{ v.reviewer }}</span></span>
            </div>
          </button>
        </div>
        <p v-if="st && !versions.length" class="text-muted" style="margin: 0; font-size: 14px">No versions uploaded yet.</p>
      </div>
    </div>

    <div v-if="isPosting" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: var(--space-6); align-items: start">
      <div style="display: flex; flex-direction: column; gap: var(--space-3)">
        <div style="aspect-ratio: 4 / 3; border-radius: calc(var(--radius-lg) * 1.4); overflow: hidden" class="washed">
          <Thumb v-if="fin" v-bind="thumb(r.num, 4, fin.versionNumber)" />
        </div>
        <span v-if="fin" class="text-muted" style="font-size: 13px">Final asset · Stage 4 · v{{ fin.versionNumber }} · <a :href="fin.driveLink" target="_blank" rel="noreferrer">Open in Drive</a></span>
      </div>
      <div :style="`display:flex; flex-direction:column; gap:var(--space-4); padding:var(--space-6); border-radius:calc(var(--radius-lg) * 1.3); background:${posted ? 'var(--color-accent-2-200)' : 'var(--color-surface)'}`">
        <h6 style="margin: 0" class="text-muted">Posting status</h6>
        <h2 style="margin: 0">{{ posted ? 'Posted' : 'Ready to post' }}</h2>
        <div class="seg" style="align-self: flex-start; background: var(--color-bg)">
          <label class="seg-opt"><input type="radio" name="post" :checked="!posted" @change="store.setPosted(r.id, false)" />Pending</label>
          <label class="seg-opt"><input type="radio" name="post" :checked="posted" @change="store.setPosted(r.id, true)" />Posted</label>
        </div>
        <div v-if="posted" style="display: grid; grid-template-columns: auto 1fr; gap: 4px var(--space-4); font-size: 14px">
          <span class="text-muted" style="align-self: center">Posted</span>
          <span v-if="dateDraft == null" style="display: flex; align-items: center; gap: var(--space-2)">
            <span>{{ fmt(r.stage5.postedAt) }}</span>
            <button class="btn btn-ghost btn-icon" title="Edit post date" aria-label="Edit post date" style="width: 30px; height: 30px; padding: 0" @click="editDate"><Icon name="pencil" :size="15" /></button>
          </span>
          <span v-else style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap">
            <input v-model="dateDraft" class="input" type="datetime-local" style="background: var(--color-bg); max-width: 230px; padding-block: 6px" />
            <button class="btn btn-primary" style="padding-block: 6px" @click="saveDate">OK</button>
            <button class="btn btn-ghost" style="padding-block: 6px" @click="dateDraft = null">Cancel</button>
          </span>
          <span class="text-muted">By</span><span>{{ r.stage5.postedBy }}</span>
        </div>
        <p class="text-muted" style="margin: 0; font-size: 13px; text-wrap: pretty">Not a one-way switch — revert to pending any time. The posted date is stamped when you mark it posted.</p>
      </div>
    </div>

    <ReviewDialog
      v-if="dialog && dialogProps"
      :title="dialogProps.title"
      body="The pilgi stays at this stage. The creator can then submit a new version."
      comment-label="What needs to change? (required)"
      placeholder="e.g. Caption covers the face — move it up"
      confirm-label="Reject version"
      required
      @cancel="dialog = null"
      @confirm="onReject"
    />
  </main>
</template>
