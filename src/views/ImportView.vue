<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { parseFile } from '../domain'
import { useRecordsStore } from '../stores/records'
import { useUiStore } from '../stores/ui'

const store = useRecordsStore()
const ui = useUiStore()
const router = useRouter()

interface Row { top: string; bottom: string; include: boolean }
const step = ref<'upload' | 'preview'>('upload')
const rows = reactive<Row[]>([])
const fileName = ref('')
const error = ref('')
const drag = ref(false)
const fileEl = ref<HTMLInputElement | null>(null)

function loadText(name: string, text: string) {
  try {
    const parsed = parseFile(name, text).map((r) => ({ ...r, include: !!(r.top && r.bottom) }))
    if (!parsed.length) throw new Error('empty')
    rows.splice(0, rows.length, ...parsed)
    fileName.value = name
    error.value = ''
    step.value = 'preview'
  } catch {
    error.value = "Couldn't read that file. Use a CSV with topSentence,bottomSentence columns or a JSON array."
  }
  drag.value = false
}
function readFile(f?: File | null) {
  if (!f) return
  const fr = new FileReader()
  fr.onload = () => loadText(f.name, String(fr.result))
  fr.readAsText(f)
}
function onFile(e: Event) {
  const el = e.target as HTMLInputElement
  readFile(el.files?.[0])
  el.value = ''
}
function onDrop(e: DragEvent) {
  drag.value = false
  readFile(e.dataTransfer?.files[0])
}
function reset() {
  step.value = 'upload'
  rows.splice(0, rows.length)
  fileName.value = ''
  error.value = ''
}

const validN = computed(() => rows.filter((r) => r.top && r.bottom).length)
const inc = computed(() => rows.filter((r) => r.include && r.top && r.bottom).length)

async function confirm() {
  const chosen = rows.filter((r) => r.include && r.top && r.bottom)
  ui.stageF = 1
  ui.statusF = 'all'
  await router.push('/')
  await store.createMany(chosen)
}
</script>

<template>
  <main data-screen-label="Batch Import" style="padding: var(--space-4) clamp(16px, 4vw, var(--space-8)) var(--space-8); max-width: 1180px">
    <button class="btn btn-ghost" style="margin-bottom: var(--space-3)" @click="router.push('/')"><Icon name="back" />Records</button>
    <h1 style="margin: 0">Batch import scenarios</h1>
    <p class="text-muted" style="margin: 0 0 var(--space-6); max-width: 560px; text-wrap: pretty">
      Each row becomes a new pilgi at Stage 1, pending review. Only the top and bottom sentence are imported.
    </p>

    <div v-if="step === 'upload'" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: var(--space-6)">
      <div
        :style="`cursor:pointer; min-height:320px; border-radius:calc(var(--radius-lg) * 1.4); border:2px dashed ${drag ? 'var(--color-accent)' : 'var(--color-divider)'}; background:${drag ? 'var(--color-accent-100)' : 'var(--color-neutral-100)'}; display:flex; flex-direction:column; justify-content:center; align-items:flex-start; gap:var(--space-3); padding:var(--space-8)`"
        @click="fileEl?.click()"
        @dragover.prevent="drag = true"
        @dragleave="drag = false"
        @drop.prevent="onDrop"
      >
        <span style="width: 64px; height: 64px; border-radius: 50%; background: var(--color-accent-200); color: var(--color-accent-700); display: grid; place-items: center">
          <Icon name="upload" :size="26" />
        </span>
        <h3 style="margin: 0">Drop a CSV or JSON file</h3>
        <p class="text-muted" style="margin: 0">or click to browse your files</p>
        <div v-if="error" style="font-size: 13px; color: var(--color-accent-700)">{{ error }}</div>
        <input ref="fileEl" type="file" accept=".csv,.json" style="display: none" @change="onFile" />
        <button v-if="store.sampleCsv" class="btn btn-secondary" style="margin-top: var(--space-2)" @click.stop="loadText('scenarios-october.csv', store.sampleCsv)">
          Try with a sample file
        </button>
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--space-3)">
        <h6 style="margin: 0" class="text-muted">Expected format</h6>
        <div class="card">
          <div class="card-kicker">CSV</div>
          <pre style="margin: 0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; font-family: ui-monospace, monospace">topSentence,bottomSentence
"When the alarm goes off","and you were mid-dream"
"My bank account","after one coffee run"</pre>
        </div>
        <div class="card">
          <div class="card-kicker">JSON</div>
          <pre style="margin: 0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; font-family: ui-monospace, monospace">[
  { "topSentence": "When the alarm goes off",
    "bottomSentence": "and you were mid-dream" }
]</pre>
        </div>
      </div>
    </div>

    <template v-else>
      <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-4)">
        <span style="display: inline-flex; align-items: center; gap: var(--space-2); padding: 6px 14px; border-radius: 999px; background: var(--color-surface); font-size: 13px">
          <Icon name="file" :size="14" />{{ fileName }}
        </span>
        <span class="tag tag-accent-2">{{ validN }} ready</span>
        <span v-if="validN < rows.length" class="tag tag-outline">{{ rows.length - validN }} need fixing</span>
        <span style="margin-left: auto; display: flex; gap: var(--space-2)">
          <button class="btn btn-secondary" @click="reset">Choose another file</button>
          <button class="btn btn-primary" :disabled="inc === 0" @click="confirm">Create {{ inc }} pilgi{{ inc === 1 ? '' : 's' }}</button>
        </span>
      </div>
      <div style="background: var(--color-neutral-100); border-radius: calc(var(--radius-lg) * 1.15); padding: var(--space-2) var(--space-3); overflow-x: auto">
        <table class="table" style="min-width: 560px">
          <thead><tr><th style="width: 34px"></th><th style="width: 40px">#</th><th>Top sentence</th><th>Bottom sentence</th><th>Check</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i" :style="`opacity:${!(r.top && r.bottom) || !r.include ? 0.55 : 1}`">
              <td><input v-model="r.include" type="checkbox" :disabled="!(r.top && r.bottom)" /></td>
              <td class="text-muted">{{ i + 1 }}</td>
              <td>{{ r.top || '—' }}</td>
              <td>{{ r.bottom || '—' }}</td>
              <td>
                <span class="tag" :class="r.top && r.bottom ? 'tag-accent-2' : 'tag-outline'">
                  {{ r.top && r.bottom ? 'Ready' : r.top ? 'Missing bottom sentence' : 'Missing top sentence' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </main>
</template>
