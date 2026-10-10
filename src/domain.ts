// Domain model and pure helpers ported from the "Image Workflow" prototype.

export type VStatus = 'pending' | 'approved' | 'rejected'
export type RecStatus = 'pending' | 'rejected' | 'approved' | 'awaiting' | 'ready' | 'posted'

export interface Version {
  versionNumber: number
  status: VStatus
  reviewedBy: string | null
  reviewedAt: string | null
  reviewComments: string
  // stage 1
  topSentence?: string
  bottomSentence?: string
  // stage 2
  scenario?: string
  // stage 3 / 4
  imageLink?: string
  driveLink?: string
  // authorship (written = stage 1-2, uploaded = stage 3-4)
  createdBy?: string
  createdAt?: string
  uploadedBy?: string
  uploadedAt?: string
}

export interface Stage {
  versions: Version[]
  selectedVersionNumber: number | null
}

export interface Stage5 {
  status: 'pending' | 'posted'
  postedBy: string | null
  postedAt: string | null
}

export interface Remark {
  by: string
  at: string
  stage: number
  text: string
}

export interface PilgiRecord {
  id: string
  num: number
  createdBy: string
  createdAt: string
  currentStage: number
  stage1: Stage
  stage2: Stage
  stage3: Stage
  stage4: Stage
  stage5: Stage5
  remarks: Remark[]
  characters?: string[]
  // Soft delete: the JSON file stays in the repo but the record is hidden in the app
  deleted?: boolean
  deletedBy?: string
  deletedAt?: string
  lastModifiedBy: string
  lastModifiedAt: string
}

export interface SeedDef {
  top: string
  bottom: string
  prevBottom?: string
  sc: string
  s1: VStatus[]
  s2?: VStatus[]
  s3?: VStatus[]
  ss?: VStatus[]
  s4?: string
  mine1?: boolean
  mineS?: boolean
  mine2?: boolean
  remarks?: Remark[]
}

export interface Seed {
  me: string
  people: string[]
  rejectComments: string[]
  records: SeedDef[]
  sampleCsv: string
}

export const SN = ['', 'Text', 'Scenario', 'Clean image', 'Image with text', 'Posting']
export const SD = [
  '',
  'Top & bottom sentence',
  'Describe the scene for the image',
  'Generated image, no text yet',
  'Final image with the caption applied',
  'Publish, then mark as posted',
]
export const TILE = [
  ['var(--color-accent-200)', 'var(--color-accent-400)'],
  ['var(--color-accent-2-200)', 'var(--color-accent-2-500)'],
  ['var(--color-neutral-300)', 'var(--color-neutral-500)'],
  ['var(--color-accent-300)', 'var(--color-accent-500)'],
  ['var(--color-accent-2-300)', 'var(--color-accent-2-600)'],
]
export const ST: Record<RecStatus, { label: string; cls: string }> = {
  pending: { label: 'Needs review', cls: 'tag-accent' },
  rejected: { label: 'Rejected', cls: 'tag-outline' },
  approved: { label: 'Approved', cls: 'tag-accent-2' },
  awaiting: { label: 'Awaiting upload', cls: 'tag-neutral' },
  ready: { label: 'Ready to post', cls: 'tag-neutral' },
  posted: { label: 'Posted', cls: 'tag-accent-2' },
}
export const CHARACTER_ICONS: Record<string, { glyph: string; bg: string }> = {
  Elephant: { glyph: 'E', bg: 'oklch(0.55 0.04 250)' },
  Giraffe: { glyph: 'G', bg: 'oklch(0.68 0.13 75)' },
  Fox: { glyph: 'F', bg: 'oklch(0.62 0.16 45)' },
}

const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const fmt = (iso: string | null | undefined, timeZone?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  let tz = timeZone
  if (!tz && typeof localStorage !== 'undefined') {
    try {
      const s = JSON.parse(localStorage.getItem('pilgi_settings') || '{}')
      if (s?.timeZone) tz = s.timeZone
    } catch {}
  }
  tz = tz || 'Asia/Jerusalem'
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)
    const m = parts.find((p) => p.type === 'month')?.value || ''
    const day = parts.find((p) => p.type === 'day')?.value || ''
    const hour = parts.find((p) => p.type === 'hour')?.value || ''
    const min = parts.find((p) => p.type === 'minute')?.value || ''
    return `${m} ${day}, ${hour}:${min}`
  } catch {
    return `${MO[d.getUTCMonth()]} ${d.getUTCDate()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }
}

/** Formats a post date ISO string as dd/MM/yyyy in the specified timeZone */
export const fmtPostDate = (iso: string | null | undefined, timeZone?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  let tz = timeZone
  if (!tz && typeof localStorage !== 'undefined') {
    try {
      const s = JSON.parse(localStorage.getItem('pilgi_settings') || '{}')
      if (s?.timeZone) tz = s.timeZone
    } catch {}
  }
  tz = tz || 'Asia/Jerusalem'
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(d)
    const day = parts.find((p) => p.type === 'day')?.value || ''
    const month = parts.find((p) => p.type === 'month')?.value || ''
    const year = parts.find((p) => p.type === 'year')?.value || ''
    return `${day}/${month}/${year}`
  } catch {
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    const year = d.getUTCFullYear()
    return `${day}/${month}/${year}`
  }
}

export const short = (e: string | null | undefined) => (e ? e.split('@')[0] : '—')
export const now = () => new Date().toISOString()
export const pad = (n: number) => 'rec_' + String(n).padStart(4, '0')

/** Converts an ISO UTC date string into YYYY-MM-DDTHH:mm in the specified timeZone */
export const isoToTzLocal = (iso: string | null | undefined, timeZone = 'Asia/Jerusalem'): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)
    const y = parts.find((p) => p.type === 'year')?.value || ''
    const m = parts.find((p) => p.type === 'month')?.value || ''
    const day = parts.find((p) => p.type === 'day')?.value || ''
    const hour = parts.find((p) => p.type === 'hour')?.value || ''
    const min = parts.find((p) => p.type === 'minute')?.value || ''
    return `${y}-${m}-${day}T${hour}:${min}`
  } catch {
    return iso.slice(0, 16)
  }
}

/** Converts a YYYY-MM-DDTHH:mm string assumed to be in timeZone into an ISO UTC string */
export const tzLocalToIso = (localStr: string, timeZone = 'Asia/Jerusalem'): string => {
  if (!localStr) return ''
  const [datePart, timePart] = localStr.split('T')
  if (!datePart || !timePart) return new Date(localStr).toISOString()
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, min] = timePart.split(':').map(Number)
  const naiveUtc = Date.UTC(year, month - 1, day, hour, min, 0)
  try {
    const invDate = new Date(naiveUtc)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(invDate)
    const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value)
    const tzYear = getPart('year')
    const tzMonth = getPart('month')
    const tzDay = getPart('day')
    let tzHour = getPart('hour')
    if (tzHour === 24) tzHour = 0
    const tzMin = getPart('minute')
    const tzSec = getPart('second')

    const tzTime = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec)
    const offsetMs = tzTime - naiveUtc
    return new Date(naiveUtc - offsetMs).toISOString()
  } catch {
    return new Date(localStr + ':00Z').toISOString()
  }
}

export const approvedIn = (st: Stage) => st.versions.some((v) => v.status === 'approved')
export const stageOf = (r: PilgiRecord) =>
  !approvedIn(r.stage1) ? 1 : !approvedIn(r.stage2) ? 2 : !approvedIn(r.stage3) ? 3 : !approvedIn(r.stage4) ? 4 : 5
export const last = (st: Stage) => st.versions[st.versions.length - 1] as Version | undefined
export const shown1 = (st: Stage) =>
  st.versions.find((v) => v.versionNumber === st.selectedVersionNumber) || (last(st) as Version)
export const stageData = (r: PilgiRecord, n: number) => r[('stage' + n) as 'stage1'] as Stage

export const thumb = (num: number, stage: number, vn: number) => {
  const c = TILE[(num * 3 + stage + vn) % TILE.length]
  return { bg: c[0], fg: c[1], text: stage === 4 }
}
export const extractGoogleDriveId = (url: string | null | undefined): string | null => {
  if (!url) return null
  const str = url.trim()
  if (!/drive\.google\.com|docs\.google\.com/i.test(str)) return null
  const dMatch = str.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (dMatch?.[1]) return dMatch[1]
  const idMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idMatch?.[1]) return idMatch[1]
  return null
}
export const recStatus = (r: PilgiRecord): RecStatus => {
  if (r.currentStage === 5) return r.stage5.status === 'posted' ? 'posted' : 'ready'
  const v = last(stageData(r, r.currentStage))
  return v ? v.status : 'awaiting'
}
export const recThumb = (r: PilgiRecord) => {
  const v4 = last(r.stage4),
    v3 = last(r.stage3)
  if (v4) return thumb(r.num, 4, v4.versionNumber)
  if (v3) return thumb(r.num, 3, v3.versionNumber)
  return null
}

export const emptyStage = (): Stage => ({ versions: [], selectedVersionNumber: null })
export const newRecord = (n: number, by: string, top: string, bottom: string): PilgiRecord => {
  const at = now()
  return {
    id: pad(n),
    num: n,
    createdBy: by,
    createdAt: at,
    currentStage: 1,
    stage1: {
      versions: [
        { versionNumber: 1, topSentence: top, bottomSentence: bottom, createdBy: by, createdAt: at, status: 'pending', reviewedBy: null, reviewedAt: null, reviewComments: '' },
      ],
      selectedVersionNumber: null,
    },
    stage2: emptyStage(),
    stage3: emptyStage(),
    stage4: emptyStage(),
    stage5: { status: 'pending', postedBy: null, postedAt: null },
    remarks: [],
    lastModifiedBy: by,
    lastModifiedAt: at,
  }
}

/** Expands a compact seed definition into a full record (demo data). */
export function build(def: SeedDef, i: number, ME: string, PEOPLE: string[], REJ: string[]): PilgiRecord {
  let t = Date.parse('2026-10-02T08:00:00Z') - (16 - i) * 86400000
  const tick = () => {
    t += (3 + (i % 3)) * 3600000
    return new Date(t).toISOString()
  }
  const who = (k: number) => PEOPLE[(i + k) % 3]
  const createdBy = def.mine1 ? ME : who(0),
    createdAt = tick()
  let lm = { by: createdBy, at: createdAt }
  const rev = (status: VStatus, j: number) => {
    if (status === 'pending') return { status, reviewedBy: null, reviewedAt: null, reviewComments: '' }
    const at = tick(),
      by = (i + j) % 4 === 0 ? ME : who(1)
    lm = { by, at }
    return {
      status,
      reviewedBy: by,
      reviewedAt: at,
      reviewComments: status === 'rejected' ? REJ[(i + j) % REJ.length] : j % 2 ? 'Looks great.' : '',
    }
  }
  const s1: Version[] = def.s1.map((st, j) => {
    const ca = j ? tick() : createdAt
    if (j) lm = { by: createdBy, at: ca }
    const old = j < def.s1.length - 1
    return {
      versionNumber: j + 1,
      topSentence: def.top,
      bottomSentence: old && def.prevBottom ? def.prevBottom : def.bottom,
      createdBy,
      createdAt: ca,
      ...rev(st, j),
    }
  })
  const ssArr = def.ss || (def.s2 ? (['approved'] as VStatus[]) : [])
  const ss: Version[] = ssArr.map((st, j) => {
    const by = def.mineS && j === ssArr.length - 1 ? ME : createdBy,
      at = tick()
    lm = { by, at }
    return {
      versionNumber: j + 1,
      scenario: j < ssArr.length - 1 ? def.sc.split(/[,;]/)[0] + '.' : def.sc,
      createdBy: by,
      createdAt: at,
      ...rev(st, j + 1),
    }
  })
  const img = (arr: VStatus[] | undefined, stage: number, key: 'imageLink' | 'driveLink', mine?: boolean): Version[] =>
    (arr || []).map((st, j) => {
      const by = mine && j === arr!.length - 1 ? ME : who(2),
        at = tick()
      lm = { by, at }
      return {
        versionNumber: j + 1,
        [key]: `https://drive.google.com/file/d/1${stage}${String(i + 1).padStart(3, '0')}v${j + 1}Qx8/view`,
        uploadedBy: by,
        uploadedAt: at,
        ...rev(st, j + stage),
      }
    })
  const sel = (vs: Version[]) => vs.find((v) => v.status === 'approved')?.versionNumber ?? null
  const s3 = img(def.s2, 3, 'imageLink', def.mine2),
    s4 = img(def.s3, 4, 'driveLink')
  let s5: Stage5 = { status: 'pending', postedBy: null, postedAt: null }
  if (def.s4 === 'posted') {
    const at = tick()
    s5 = { status: 'posted', postedBy: who(1), postedAt: at }
    lm = { by: s5.postedBy!, at }
  }
  const r: PilgiRecord = {
    id: pad(i + 1),
    num: i + 1,
    createdBy,
    createdAt,
    currentStage: 1,
    stage1: { versions: s1, selectedVersionNumber: sel(s1) },
    stage2: { versions: ss, selectedVersionNumber: sel(ss) },
    stage3: { versions: s3, selectedVersionNumber: sel(s3) },
    stage4: { versions: s4, selectedVersionNumber: sel(s4) },
    stage5: s5,
    remarks: def.remarks || [],
    lastModifiedBy: lm.by,
    lastModifiedAt: lm.at,
  }
  r.currentStage = stageOf(r)
  return r
}

function splitCSV(line: string) {
  const out: string[] = []
  let cur = '',
    q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else q = false
      } else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

/** Parses a CSV (topSentence,bottomSentence) or JSON array into import rows. */
export function parseFile(name: string, text: string): { top: string; bottom: string }[] {
  if (/\.json$/i.test(name) || /^\s*[[{]/.test(text)) {
    let data = JSON.parse(text)
    if (!Array.isArray(data)) data = data.scenarios || []
    return data.map((o: Record<string, unknown>) => ({
      top: String(o.topSentence || '').trim(),
      bottom: String(o.bottomSentence || '').trim(),
    }))
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length && /topsentence/i.test(lines[0])) lines.shift()
  return lines.map((l) => {
    const c = splitCSV(l)
    return { top: c[0] || '', bottom: c[1] || '' }
  })
}
