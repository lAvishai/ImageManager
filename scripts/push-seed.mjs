// Seeds a GitHub repo with the demo records from public/data/seed.json.
// Usage: GH_TOKEN=... node scripts/push-seed.mjs owner/name [branch]
import { readFileSync } from 'node:fs'
import { build } from '../src/domain.ts'
import { RecordsRepo } from '../src/services/github.ts'

const [repoArg, branch = 'main'] = process.argv.slice(2)
const token = process.env.GH_TOKEN
if (!repoArg || !token) {
  console.error('Usage: GH_TOKEN=... node scripts/push-seed.mjs owner/name [branch]')
  process.exit(1)
}
const repoName = repoArg.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '')

const seed = JSON.parse(readFileSync(new URL('../public/data/seed.json', import.meta.url), 'utf8'))
const records = seed.records.map((d, i) => build(d, i, seed.me, seed.people, seed.rejectComments))

const repo = new RecordsRepo(token, { repo: repoName, branch })
const existing = await repo.list()
if (existing.length) {
  console.error(`Refusing to overwrite: ${repoName} already has ${existing.length} records.`)
  process.exit(2)
}
for (const r of records) {
  await repo.save(r, `Seed ${r.id}`)
  console.log('saved', r.id)
}
console.log(`Done: ${records.length} records pushed to ${repoName}@${branch}`)
