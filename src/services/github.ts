import { Octokit } from 'octokit'
import type { PilgiRecord } from '../domain'

export interface RepoRef {
  repo: string // "owner/name"
  branch: string
}

const utf8 = {
  enc: (s: string) => {
    const bytes = new TextEncoder().encode(s)
    let bin = ''
    bytes.forEach((b) => (bin += String.fromCharCode(b)))
    return btoa(bin)
  },
  dec: (b64: string) => {
    const bin = atob(b64.replace(/\n/g, ''))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  },
}

const status = (e: unknown) => (e as { status?: number }).status

/** Stores each record as records/<id>.json in the configured GitHub repo. */
export class RecordsRepo {
  private kit: Octokit
  private owner: string
  private name: string
  private branch: string
  private shas = new Map<string, string>()

  constructor(token: string, ref: RepoRef) {
    const [owner, name] = ref.repo.split('/')
    if (!owner || !name) throw new Error('Repository must look like owner/name.')
    this.owner = owner
    this.name = name
    this.branch = ref.branch || 'main'
    this.kit = new Octokit({ auth: token })
  }

  private path = (id: string) => `records/${id}.json`

  /** Throws if the token/repo are invalid; returns [] for an empty repo. */
  async list(): Promise<PilgiRecord[]> {
    await this.kit.rest.repos.get({ owner: this.owner, repo: this.name })
    let entries
    try {
      const res = await this.kit.rest.repos.getContent({ owner: this.owner, repo: this.name, path: 'records', ref: this.branch })
      entries = Array.isArray(res.data) ? res.data : []
    } catch (e) {
      if (status(e) === 404) return []
      throw e
    }
    const files = entries.filter((f) => f.type === 'file' && f.name.endsWith('.json'))
    return Promise.all(
      files.map(async (f) => {
        const res = await this.kit.rest.repos.getContent({ owner: this.owner, repo: this.name, path: f.path, ref: this.branch })
        const data = res.data as { content: string; sha: string }
        this.shas.set(f.path, data.sha)
        return JSON.parse(utf8.dec(data.content)) as PilgiRecord
      }),
    )
  }

  private async fetchSha(path: string) {
    try {
      const res = await this.kit.rest.repos.getContent({ owner: this.owner, repo: this.name, path, ref: this.branch })
      return (res.data as { sha: string }).sha
    } catch (e) {
      if (status(e) === 404) return undefined
      throw e
    }
  }

  async save(r: PilgiRecord, message: string) {
    const path = this.path(r.id)
    const put = (sha?: string) =>
      this.kit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.name,
        path,
        branch: this.branch,
        message,
        content: utf8.enc(JSON.stringify(r, null, 2) + '\n'),
        sha,
      })
    try {
      const res = await put(this.shas.get(path))
      this.shas.set(path, res.data.content!.sha!)
    } catch (e) {
      if (status(e) !== 409 && status(e) !== 422) throw e
      const res = await put(await this.fetchSha(path)) // stale sha: refetch once and retry
      this.shas.set(path, res.data.content!.sha!)
    }
  }

  async getSettings<T>(): Promise<T | null> {
    try {
      const res = await this.kit.rest.repos.getContent({ owner: this.owner, repo: this.name, path: 'settings.json', ref: this.branch })
      const data = res.data as { content: string; sha: string }
      this.shas.set('settings.json', data.sha)
      return JSON.parse(utf8.dec(data.content)) as T
    } catch (e) {
      if (status(e) === 404) return null
      throw e
    }
  }

  async saveSettings<T>(settings: T, message: string): Promise<void> {
    const path = 'settings.json'
    const put = (sha?: string) =>
      this.kit.rest.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.name,
        path,
        branch: this.branch,
        message,
        content: utf8.enc(JSON.stringify(settings, null, 2) + '\n'),
        sha,
      })
    try {
      const res = await put(this.shas.get(path))
      this.shas.set(path, res.data.content!.sha!)
    } catch (e) {
      if (status(e) !== 409 && status(e) !== 422) throw e
      const res = await put(await this.fetchSha(path))
      this.shas.set(path, res.data.content!.sha!)
    }
  }
}
