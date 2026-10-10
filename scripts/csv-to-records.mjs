// Converts misc/History.csv into record JSON files (one per row) in misc/records/.
// Usage: node scripts/csv-to-records.mjs [--dry]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const CREATOR = 'avishail@gmail.com'
const APPROVER = 'anatsosinsky@gmail.com'
const STAMP = '2026-10-10T00:00:00.000Z' // every review / creation / modification date
const dry = process.argv.includes('--dry')

/** RFC-4180-ish parser (handles quoted commas, quotes and newlines). */
function parseCSV(text) {
  const rows = []
  let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cur); cur = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cur); cur = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else cur += ch
  }
  row.push(cur)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

const clean = (s) => (s ?? '').trim()
const filled = (s) => clean(s) !== '' && clean(s) !== '-'
const character = (s) => clean(s).replace(/^the\s+/i, '')
const pad = (n) => 'rec_' + String(n).padStart(4, '0')
const dmy = (s) => {
  const m = clean(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00.000Z` : null
}

const rawBuf = readFileSync(new URL('../misc/History.csv', import.meta.url))
// History.csv was saved from Excel in ANSI/Windows-1252 encoding (containing smart quotes, apostrophes 0x92, em-dashes 0x97, ellipsis 0x85)
const csvText = new TextDecoder('windows-1252').decode(rawBuf).replace(/^\uFEFF/, '')
const rows = parseCSV(csvText)
rows.shift() // header

const review = (approved) =>
  approved
    ? { status: 'approved', reviewedBy: APPROVER, reviewedAt: STAMP, reviewComments: '' }
    : { status: 'pending', reviewedBy: null, reviewedAt: null, reviewComments: '' }

const stats = { total: 0, byStage: {}, gaps: [], extraCol6: [] }
const out = []

for (const c of rows) {
  const num = parseInt(clean(c[0]), 10)
  if (!Number.isFinite(num)) continue
  const top = clean(c[1]), bottom = clean(c[2])
  const scenario = clean(c[3]), a = character(c[4]), b = character(c[5])
  const cleanLink = clean(c[7]), textLink = clean(c[8]), posted = dmy(c[9])
  if (filled(c[6])) stats.extraCol6.push(num)

  // Stage reached = last filled column
  const has = [null, true, filled(scenario), filled(cleanLink), filled(textLink), !!posted]
  let last = 1
  for (let s = 5; s >= 1; s--) if (has[s]) { last = s; break }
  for (let s = 2; s < last; s++) if (!has[s]) stats.gaps.push(`${pad(num)} missing stage ${s}`)

  const done = (s) => s < last || (s === 4 && last === 5) // stages before the last one are approved
  const stage = (s, version) => ({
    versions: version ? [{ versionNumber: 1, ...version }] : [],
    selectedVersionNumber: version && done(s) ? 1 : null,
  })
  const w = { createdBy: CREATOR, createdAt: STAMP }
  const u = { uploadedBy: CREATOR, uploadedAt: STAMP }

  const rec = {
    id: pad(num),
    num,
    createdBy: CREATOR,
    createdAt: STAMP,
    currentStage: last,
    stage1: stage(1, { topSentence: top, bottomSentence: bottom, ...w, ...review(done(1)) }),
    stage2: stage(2, has[2] ? { scenario, ...w, ...review(done(2)) } : null),
    stage3: stage(3, has[3] || 3 < last ? { imageLink: cleanLink, ...u, ...review(done(3)) } : null),
    stage4: stage(4, has[4] || 4 < last ? { driveLink: textLink, ...u, ...review(done(4)) } : null),
    stage5: posted
      ? { status: 'posted', postedBy: CREATOR, postedAt: posted }
      : { status: 'pending', postedBy: null, postedAt: null },
    remarks: [],
    characters: [a, b],
    lastModifiedBy: CREATOR,
    lastModifiedAt: STAMP,
  }
  out.push(rec)
  stats.total++
  stats.byStage[last] = (stats.byStage[last] || 0) + 1
}

if (!dry) {
  mkdirSync(new URL('../misc/records/', import.meta.url), { recursive: true })
  for (const r of out) writeFileSync(new URL(`../misc/records/${r.id}.json`, import.meta.url), JSON.stringify(r, null, 2) + '\n')
}
console.log(dry ? 'DRY RUN' : 'Written to misc/records/', JSON.stringify(stats, null, 1))
