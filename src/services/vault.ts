// Encrypts the GitHub token with a key derived from the user's password
// (PBKDF2 -> AES-GCM). Only the ciphertext is stored in localStorage.

export interface Vault {
  email: string
  repo: string
  branch: string
  salt: string
  iv: string
  ct: string
}

const b64 = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b)
  let s = ''
  u.forEach((x) => (s += String.fromCharCode(x)))
  return btoa(s)
}
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function key(pw: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 250_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptToken(token: string, pw: string, meta: Pick<Vault, 'email' | 'repo' | 'branch'>): Promise<Vault> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(pw, salt), new TextEncoder().encode(token))
  return { ...meta, salt: b64(salt), iv: b64(iv), ct: b64(ct) }
}

/** Throws if the password is wrong (AES-GCM auth failure). */
export async function decryptToken(v: Vault, pw: string): Promise<string> {
  const k = await key(pw, unb64(v.salt))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(v.iv) as BufferSource }, k, unb64(v.ct) as BufferSource)
  return new TextDecoder().decode(pt)
}

const VAULT_KEY = 'pilgi_vault'
const COOKIE = 'pilgi_pw'

export const loadVault = (): Vault | null => {
  try {
    return JSON.parse(localStorage.getItem(VAULT_KEY) || 'null')
  } catch {
    return null
  }
}
export const saveVault = (v: Vault) => localStorage.setItem(VAULT_KEY, JSON.stringify(v))

export const getPwCookie = () => {
  const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}
export const setPwCookie = (pw: string | null) => {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = pw
    ? `${COOKIE}=${encodeURIComponent(pw)}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Strict${secure}`
    : `${COOKIE}=; Max-Age=0; Path=/; SameSite=Strict${secure}`
}
