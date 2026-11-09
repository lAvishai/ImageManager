import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { decryptToken, encryptToken, getPwCookie, loadVault, saveVault, setPwCookie } from '../services/vault'

export const useAuthStore = defineStore('auth', () => {
  const vault = loadVault()
  const hasCookie = !!getPwCookie()

  const mode = ref<'setup' | 'unlock'>(vault ? 'unlock' : 'setup')
  const form = reactive({
    email: vault?.email ?? '',
    repo: vault?.repo ?? '',
    branch: vault?.branch ?? 'main',
    token: '',
    pw: '',
    pw2: '',
    remember: true,
  })
  const error = ref('')
  const busy = ref(false)

  // Session state (memory only; the token is never written unencrypted)
  const unlocked = ref(false)
  const token = ref('')
  const email = ref(form.email)
  const repo = ref(form.repo)
  const branch = ref(form.branch)
  const savedPasswordFound = computed(() => hasCookie && !!loadVault())

  function fail(msg: string) {
    error.value = msg
    busy.value = false
    return false
  }

  async function finish(tok: string, pw: string) {
    token.value = tok
    email.value = form.email
    repo.value = form.repo
    branch.value = form.branch || 'main'
    setPwCookie(form.remember ? pw : null)
    unlocked.value = true
    form.pw = form.pw2 = form.token = ''
    mode.value = 'unlock'
    busy.value = false
    return true
  }

  // Accepts "owner/name", "github.com/owner/name", full https URLs and ".git" suffixes
  const normalizeRepo = (s: string) =>
    s.trim().replace(/^https?:\/\//i, '').replace(/^(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '')

  async function setup() {
    form.repo = normalizeRepo(form.repo)
    if (!form.email || !form.repo || !form.token) return fail('Email, repository and token are all required.')
    if (!/^[^/\s]+\/[^/\s]+$/.test(form.repo)) return fail('Repository must look like owner/name.')
    if (form.pw.length < 8) return fail('Password needs at least 8 characters.')
    if (form.pw !== form.pw2) return fail("Passwords don't match.")
    busy.value = true
    try {
      saveVault(await encryptToken(form.token.trim(), form.pw, { email: form.email, repo: form.repo, branch: form.branch || 'main' }))
    } catch (e) {
      return fail(`Couldn't encrypt the token: ${(e as Error).message}`)
    }
    return finish(form.token.trim(), form.pw)
  }

  async function unlock(pw: string) {
    const v = loadVault()
    if (!v) return fail('Nothing saved on this browser yet — set up first.')
    if (!pw) return fail('Enter your password to unlock.')
    busy.value = true
    try {
      const tok = await decryptToken(v, pw)
      Object.assign(form, { email: v.email, repo: v.repo, branch: v.branch })
      return finish(tok, pw)
    } catch {
      return fail('Wrong password.')
    }
  }

  const submit = () => {
    error.value = ''
    return mode.value === 'setup' ? setup() : unlock(form.pw)
  }
  const useCookie = () => {
    error.value = ''
    return unlock(getPwCookie() || '')
  }
  const toSetup = () => ((mode.value = 'setup'), (error.value = ''))
  const toUnlock = () => ((mode.value = 'unlock'), (error.value = ''))

  function lock() {
    unlocked.value = false
    token.value = ''
    form.pw = ''
    error.value = ''
    mode.value = 'unlock'
  }

  return { mode, form, error, busy, unlocked, token, email, repo, branch, savedPasswordFound, submit, useCookie, toSetup, toUnlock, lock }
})
