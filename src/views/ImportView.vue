<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { hasHebrew, parseFile, parseSentencesText } from '../domain'
import { useRecordsStore } from '../stores/records'
import { useUiStore } from '../stores/ui'

const store = useRecordsStore()
const ui = useUiStore()
const router = useRouter()

interface Row { top: string; bottom: string; include: boolean }
const step = ref<'upload' | 'preview'>('upload')
const mode = ref<'paste' | 'file'>('paste')
const pasteText = ref('')
const rows = reactive<Row[]>([])
const fileName = ref('')
const error = ref('')
const drag = ref(false)
const fileEl = ref<HTMLInputElement | null>(null)

function loadText(name: string, text: string) {
  try {
    const parsed = parseFile(name, text).map((r) => ({ ...r, include: !!(r.top.trim() && r.bottom.trim()) }))
    if (!parsed.length) throw new Error('empty')
    rows.splice(0, rows.length, ...parsed)
    fileName.value = name
    error.value = ''
    step.value = 'preview'
  } catch {
    error.value = "Couldn't read that file. Use a CSV, TSV (Sheets), or JSON array."
  }
  drag.value = false
}

function processPastedText() {
  if (!pasteText.value.trim()) {
    error.value = 'Please paste some sentences first.'
    return
  }
  try {
    const parsed = parseSentencesText(pasteText.value).map((r) => ({ ...r, include: !!(r.top.trim() && r.bottom.trim()) }))
    if (!parsed.length) throw new Error('empty')
    rows.splice(0, rows.length, ...parsed)
    fileName.value = `Pasted text (${parsed.length} item${parsed.length === 1 ? '' : 's'})`
    error.value = ''
    step.value = 'preview'
  } catch {
    error.value = "Couldn't parse sentences from the pasted text. Please verify the format."
  }
}

async function pasteFromClipboard() {
  try {
    if (navigator?.clipboard?.readText) {
      const text = await navigator.clipboard.readText()
      if (text) {
        pasteText.value = text
        error.value = ''
      }
    }
  } catch {
    error.value = 'Clipboard access was blocked by the browser. Please paste directly into the box with Ctrl+V / Cmd+V.'
  }
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

const validN = computed(() => rows.filter((r) => r.top.trim() && r.bottom.trim()).length)
const inc = computed(() => rows.filter((r) => r.include && r.top.trim() && r.bottom.trim()).length)

const allSelected = computed({
  get: () => validN.value > 0 && inc.value === validN.value,
  set: (val: boolean) => {
    rows.forEach((r) => {
      if (r.top.trim() && r.bottom.trim()) {
        r.include = val
      }
    })
  },
})

async function confirm() {
  const chosen = rows
    .filter((r) => r.include && r.top.trim() && r.bottom.trim())
    .map((r) => ({ top: r.top.trim(), bottom: r.bottom.trim() }))
  ui.stageF = 1
  ui.statusF = 'all'
  await router.push('/')
  await store.createMany(chosen)
}
</script>

<template>
  <main data-screen-label="Batch Import" style="padding: var(--space-1) clamp(16px, 4vw, var(--space-8)) var(--space-8); max-width: 1180px">
    <button class="btn btn-ghost" style="margin-bottom: var(--space-3)" @click="router.push('/')">
      <Icon name="back" />Records
    </button>
    <h1 style="margin: 0">Batch import sentences</h1>
    <p class="text-muted" style="margin: 0 0 var(--space-4); max-width: 560px; text-wrap: pretty">
      Each row becomes a new pilgi at Stage 1, pending review. Only the top and bottom sentence are imported.
    </p>

    <!-- Paste or Upload tab switch -->
    <div v-if="step === 'upload'" class="seg" style="margin-bottom: var(--space-6); align-self: flex-start; display: inline-flex">
      <label class="seg-opt">
        <input type="radio" name="importMode" value="paste" :checked="mode === 'paste'" @change="mode = 'paste'; error = ''" />
        <span style="display: inline-flex; align-items: center; gap: var(--space-2)"><Icon name="clipboard" :size="15" />Paste sentences</span>
      </label>
      <label class="seg-opt">
        <input type="radio" name="importMode" value="file" :checked="mode === 'file'" @change="mode = 'file'; error = ''" />
        <span style="display: inline-flex; align-items: center; gap: var(--space-2)"><Icon name="upload" :size="15" />Upload file</span>
      </label>
    </div>

    <!-- Step 1: Paste Sentences Mode -->
    <div v-if="step === 'upload' && mode === 'paste'" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: var(--space-6)">
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-6)">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2)">
          <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: var(--space-2)">
            <Icon name="clipboard" :size="18" />Paste sentences
          </h3>
          <button class="btn btn-secondary" type="button" style="padding: 0 var(--space-3); height: 32px; font-size: 12px" @click="pasteFromClipboard">
            <Icon name="clipboard" :size="13" />Paste from clipboard
          </button>
        </div>
        <textarea
          v-model="pasteText"
          class="input"
          :dir="hasHebrew(pasteText) ? 'rtl' : 'ltr'"
          placeholder="Paste sentences here...
Supports:
• Excel / Sheets (copy 2 columns)
• CSV or semicolon-separated
• Pipe separated (Top sentence | Bottom sentence)
• Alternating lines (Top line, Bottom line)
• JSON array"
          style="width: 100%; height: 260px; font-family: ui-monospace, monospace; font-size: 13px; line-height: 1.5; padding: var(--space-3); border-radius: var(--radius-md); resize: vertical; box-sizing: border-box"
        />
        <div v-if="error" style="font-size: 13px; color: var(--color-accent-700)">{{ error }}</div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: var(--space-2)">
          <button class="btn btn-ghost" type="button" :disabled="!pasteText" @click="pasteText = ''; error = ''">
            Clear
          </button>
          <button class="btn btn-primary" type="button" :disabled="!pasteText.trim()" @click="processPastedText">
            Preview sentences
          </button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: var(--space-3)">
        <h6 style="margin: 0" class="text-muted">Supported paste formats</h6>
        <div class="card">
          <div class="card-kicker">Sheets / Excel (Tab separated)</div>
          <pre style="margin: 0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; font-family: ui-monospace, monospace">When the alarm goes off	and you were mid-dream
My bank account	after one coffee run</pre>
        </div>
        <div class="card">
          <div class="card-kicker">CSV or Pipe (|)</div>
          <pre style="margin: 0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; font-family: ui-monospace, monospace">"When the alarm goes off","and you were mid-dream"
or:
When the alarm goes off | and you were mid-dream</pre>
        </div>
        <div class="card">
          <div class="card-kicker">Paired lines (Top & Bottom)</div>
          <pre style="margin: 0; font-size: 12px; line-height: 1.6; white-space: pre-wrap; font-family: ui-monospace, monospace">When the alarm goes off
and you were mid-dream

My bank account
after one coffee run</pre>
        </div>
      </div>
    </div>

    <!-- Step 1: Upload File Mode -->
    <div v-else-if="step === 'upload' && mode === 'file'" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: var(--space-6)">
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
        <h3 style="margin: 0">Drop a CSV, TSV, or JSON file</h3>
        <p class="text-muted" style="margin: 0">or click to browse your files</p>
        <div v-if="error" style="font-size: 13px; color: var(--color-accent-700)">{{ error }}</div>
        <input ref="fileEl" type="file" accept=".csv,.tsv,.json,.txt" style="display: none" @change="onFile" />
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

    <!-- Step 2: Preview Mode -->
    <template v-else>
      <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin-bottom: var(--space-4)">
        <span style="display: inline-flex; align-items: center; gap: var(--space-2); padding: 6px 14px; border-radius: 999px; background: var(--color-surface); font-size: 13px">
          <Icon :name="mode === 'paste' ? 'clipboard' : 'file'" :size="14" />{{ fileName }}
        </span>
        <span class="tag tag-accent-2">{{ validN }} ready</span>
        <span v-if="validN < rows.length" class="tag tag-outline">{{ rows.length - validN }} need fixing</span>
        <span style="margin-left: auto; display: flex; gap: var(--space-2)">
          <button class="btn btn-secondary" @click="reset">
            {{ mode === 'paste' ? 'Edit pasted text' : 'Choose another file' }}
          </button>
          <button class="btn btn-primary" :disabled="inc === 0" @click="confirm">
            Create {{ inc }} pilgi{{ inc === 1 ? '' : 's' }}
          </button>
        </span>
      </div>
      <div style="background: var(--color-neutral-100); border-radius: calc(var(--radius-lg) * 1.15); padding: var(--space-2) var(--space-3); overflow-x: auto">
        <table class="table" style="min-width: 560px">
          <thead>
            <tr>
              <th style="width: 34px">
                <input type="checkbox" v-model="allSelected" :disabled="validN === 0" title="Select / deselect all valid rows" />
              </th>
              <th style="width: 40px">#</th>
              <th>Top sentence</th>
              <th>Bottom sentence</th>
              <th style="width: 140px">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i" :style="`opacity:${!(r.top.trim() && r.bottom.trim()) || !r.include ? 0.65 : 1}`">
              <td><input v-model="r.include" type="checkbox" :disabled="!(r.top.trim() && r.bottom.trim())" /></td>
              <td class="text-muted">{{ i + 1 }}</td>
              <td>
                <textarea
                  v-model="r.top"
                  rows="1"
                  class="input"
                  style="width: 100%; border-radius: var(--radius-sm); padding: 6px 8px; font-size: 13px; resize: vertical; min-height: 34px; box-sizing: border-box"
                  :dir="hasHebrew(r.top) ? 'rtl' : 'ltr'"
                  placeholder="Top sentence..."
                />
              </td>
              <td>
                <textarea
                  v-model="r.bottom"
                  rows="1"
                  class="input"
                  style="width: 100%; border-radius: var(--radius-sm); padding: 6px 8px; font-size: 13px; resize: vertical; min-height: 34px; box-sizing: border-box"
                  :dir="hasHebrew(r.bottom) ? 'rtl' : 'ltr'"
                  placeholder="Bottom sentence..."
                />
              </td>
              <td>
                <span class="tag" :class="r.top.trim() && r.bottom.trim() ? 'tag-accent-2' : 'tag-outline'">
                  {{ r.top.trim() && r.bottom.trim() ? 'Ready' : r.top.trim() ? 'Missing bottom' : 'Missing top' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </main>
</template>
