import { defineStore } from 'pinia'
import { ref } from 'vue'
import { type PilgiRecord, newRecord, now, stageData, stageOf } from '../domain'
import { RecordsRepo } from '../services/github'
import { useAuthStore } from './auth'

export const useRecordsStore = defineStore('records', () => {
  const auth = useAuthStore()
  const records = ref<PilgiRecord[]>([])
  const loaded = ref(false)
  const loadError = ref('') // set when the configured repo can't be read
  const toastMsg = ref<string | null>(null)
  let repo: RecordsRepo | null = null
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  function toast(msg: string) {
    clearTimeout(toastTimer)
    toastMsg.value = msg
    toastTimer = setTimeout(() => (toastMsg.value = null), 3200)
  }

  /** Loads records from the repo entered at login. The repo is the only data source. */
  async function init() {
    loaded.value = false
    loadError.value = ''
    records.value = []
    try {
      repo = new RecordsRepo(auth.token, { repo: auth.repo, branch: auth.branch })
      records.value = await repo.list()
    } catch (e) {
      repo = null
      loadError.value = `Couldn't read ${auth.repo}@${auth.branch}: ${(e as Error).message}`
    }
    loaded.value = true
  }

  function reset() {
    records.value = []
    repo = null
    loaded.value = false
    loadError.value = ''
  }

  async function persist(rs: PilgiRecord[], msg: string) {
    if (!repo) return toast(`Not saved: ${loadError.value || 'no repository connected'}`)
    try {
      for (const r of rs) await repo.save(r, msg)
      toast(`Committed: ${msg}`)
    } catch (e) {
      toast(`Commit failed: ${(e as Error).message}`)
    }
  }

  const byId = (id: string) => records.value.find((r) => r.id === id)

  /** Applies fn to a deep copy of each record, then stores and commits the result. */
  function mutate(ids: string | string[], fn: (r: PilgiRecord) => void, msg: string) {
    const set = new Set([ids].flat())
    const changed: PilgiRecord[] = []
    records.value = records.value.map((r) => {
      if (!set.has(r.id)) return r
      const c: PilgiRecord = JSON.parse(JSON.stringify(r))
      fn(c)
      c.lastModifiedBy = auth.email
      c.lastModifiedAt = now()
      c.currentStage = stageOf(c)
      changed.push(c)
      return c
    })
    return persist(changed, msg)
  }

  function review(id: string, mode: 'approve' | 'reject', stage: number, vn: number, comment: string) {
    return mutate(
      id,
      (r) => {
        const st = stageData(r, stage)
        const v = st.versions.find((x) => x.versionNumber === vn)!
        Object.assign(v, { status: mode === 'approve' ? 'approved' : 'rejected', reviewedBy: auth.email, reviewedAt: now(), reviewComments: comment })
        if (mode === 'approve') {
          st.selectedVersionNumber = vn
          if (stage === 4) r.stage5 = { status: 'pending', postedBy: null, postedAt: null }
        }
      },
      `${id}: stage ${stage} v${vn} ${mode === 'approve' ? 'approved' : 'rejected'}`,
    )
  }

  function addImage(id: string, stage: number, link: string) {
    return mutate(
      id,
      (r) => {
        const st = stageData(r, stage)
        st.versions.push({
          versionNumber: st.versions.length + 1,
          [stage === 3 ? 'imageLink' : 'driveLink']: link,
          uploadedBy: auth.email,
          uploadedAt: now(),
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          reviewComments: '',
        })
      },
      `${id}: new stage ${stage} version`,
    )
  }

  function saveText(id: string, stage: 1 | 2, e: { mode: 'edit' | 'new'; vn?: number; top: string; bottom: string; scenario: string }) {
    const body = stage === 1 ? { topSentence: e.top.trim(), bottomSentence: e.bottom.trim() } : { scenario: e.scenario.trim() }
    return mutate(
      id,
      (r) => {
        const vs = stageData(r, stage).versions
        if (e.mode === 'edit') Object.assign(vs.find((x) => x.versionNumber === e.vn)!, body)
        else
          vs.push({ versionNumber: vs.length + 1, ...body, createdBy: auth.email, createdAt: now(), status: 'pending', reviewedBy: null, reviewedAt: null, reviewComments: '' })
      },
      e.mode === 'edit' ? `${id}: v${e.vn} updated` : `${id}: new ${stage === 1 ? 'text' : 'scenario'} version`,
    )
  }

  const nextNum = () => records.value.reduce((m, r) => Math.max(m, r.num), 0)

  async function create(top: string, bottom: string) {
    const rec = newRecord(nextNum() + 1, auth.email, top, bottom)
    records.value = [...records.value, rec]
    await persist([rec], `${rec.id}: created`)
    return rec.id
  }

  async function createMany(rows: { top: string; bottom: string }[]) {
    let n = nextNum()
    const created = rows.map((r) => newRecord(++n, auth.email, r.top, r.bottom))
    records.value = [...records.value, ...created]
    await persist(created, `Imported ${created.length} new pilgis`)
  }

  const setCharacter = (id: string, k: number, v: string) =>
    mutate(id, (c) => { const a = [...(c.characters || ['', ''])]; a[k] = v; c.characters = a }, `${id}: characters updated`)
  const addRemark = (id: string, stage: number, text: string) =>
    mutate(id, (c) => { c.remarks = [...(c.remarks || []), { by: auth.email, at: now(), stage, text }] }, `${id}: remark added`)
  const setPosted = (id: string, posted: boolean) =>
    mutate(id, (c) => { c.stage5 = posted ? { status: 'posted', postedBy: auth.email, postedAt: now() } : { status: 'pending', postedBy: null, postedAt: null } }, `${id}: ${posted ? 'marked posted' : 'reverted to pending'}`)
  const setPostDate = (id: string, iso: string) =>
    mutate(id, (c) => { c.stage5.postedAt = iso }, `${id}: post date updated`)

  return { records, loaded, loadError, toastMsg, toast, init, reset, byId, mutate, review, addImage, saveText, create, createMany, setCharacter, addRemark, setPosted, setPostDate }
})
