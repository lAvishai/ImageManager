<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from '../components/Icon.vue'
import { SD, SN } from '../domain'
import { useAuthStore } from '../stores/auth'
import { useRecordsStore } from '../stores/records'

const auth = useAuthStore()
const records = useRecordsStore()
const router = useRouter()
const stages = [1, 2, 3, 4, 5].map((n) => ({ n, name: SN[n], desc: SD[n] }))
const isSetup = computed(() => auth.mode === 'setup')

async function enter(ok: boolean) {
  if (!ok) return
  void records.init()
  router.replace('/')
}
const submit = async () => enter(await auth.submit())
const useCookie = async () => enter(await auth.useCookie())
</script>

<template>
  <div
    data-screen-label="Login / Setup"
    style="min-height: 100vh; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr)); gap: var(--space-8); padding: clamp(16px, 4vw, var(--space-8))"
  >
    <div style="display: flex; flex-direction: column; gap: var(--space-6); max-width: 460px; padding: var(--space-4) 0 0 clamp(0px, 2vw, var(--space-6))">
      <div class="nav-brand" style="font-size: 22px">PilGi Manager</div>

      <template v-if="isSetup">
        <div>
          <h1 style="font-size: 46px">Set up this browser</h1>
          <p class="text-muted" style="margin: 0; text-wrap: pretty">
            Paste your git access token once. It's encrypted with a key derived from your password before anything is stored.
          </p>
        </div>
        <form style="display: flex; flex-direction: column; gap: var(--space-3)" @submit.prevent="submit">
          <div class="field"><label>Your email</label><input v-model="auth.form.email" class="input" type="email" /></div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: var(--space-3)">
            <div class="field"><label>Repository</label><input v-model="auth.form.repo" class="input" placeholder="owner/name" /></div>
            <div class="field"><label>Branch</label><input v-model="auth.form.branch" class="input" /></div>
          </div>
          <div class="field">
            <label>Personal access token</label>
            <input v-model="auth.form.token" class="input" type="password" placeholder="ghp_••••••••••••••••" autocomplete="off" />
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr)); gap: var(--space-3)">
            <div class="field"><label>Password</label><input v-model="auth.form.pw" class="input" type="password" placeholder="8+ characters" autocomplete="new-password" /></div>
            <div class="field"><label>Confirm password</label><input v-model="auth.form.pw2" class="input" type="password" autocomplete="new-password" /></div>
          </div>
          <label style="display: flex; gap: var(--space-2); align-items: flex-start; font-size: 13px; cursor: pointer">
            <input v-model="auth.form.remember" type="checkbox" style="margin-top: 3px" />
            <span>
              Remember password in a cookie on this device
              <span class="text-muted" style="display: block; font-size: 12px; text-wrap: pretty">
                Anyone with access to this browser could decrypt the token. Turn off on shared computers.
              </span>
            </span>
          </label>
          <div v-if="auth.error" style="font-size: 13px; color: var(--color-accent-700)">{{ auth.error }}</div>
          <div style="display: flex; gap: var(--space-3); align-items: center; margin-top: var(--space-2)">
            <button class="btn btn-primary" type="submit" :disabled="auth.busy" style="padding-inline: var(--space-6)">
              {{ auth.busy ? 'Encrypting token…' : 'Encrypt & continue' }}
            </button>
            <button class="btn btn-ghost" type="button" @click="auth.toUnlock">I've set up before</button>
          </div>
        </form>
      </template>

      <template v-else>
        <div>
          <h1 style="font-size: 46px">Welcome back</h1>
          <p class="text-muted" style="margin: 0">
            Unlock to decrypt your token and load pilgis from <b style="color: var(--color-text)">{{ auth.form.repo }}</b
            >.
          </p>
        </div>
        <div
          v-if="auth.savedPasswordFound"
          style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-radius: 999px; background: var(--color-accent-2-100); color: var(--color-accent-2-800); font-size: 13px"
        >
          <Icon name="check" />
          <span style="flex: 1">Saved password found for {{ auth.form.email }}</span>
          <button class="btn btn-ghost" type="button" style="color: var(--color-accent-2-800)" @click="useCookie">Continue</button>
        </div>
        <form style="display: flex; flex-direction: column; gap: var(--space-3)" @submit.prevent="submit">
          <div class="field"><label>Or enter your password</label><input v-model="auth.form.pw" class="input" type="password" autocomplete="current-password" /></div>
          <div v-if="auth.error" style="font-size: 13px; color: var(--color-accent-700)">{{ auth.error }}</div>
          <div style="display: flex; gap: var(--space-3); align-items: center">
            <button class="btn btn-primary" type="submit" :disabled="auth.busy" style="padding-inline: var(--space-6)">
              {{ auth.busy ? 'Decrypting…' : 'Unlock' }}
            </button>
            <button class="btn btn-ghost" type="button" @click="auth.toSetup">Reset with a new token</button>
          </div>
        </form>
      </template>
    </div>

    <div
      style="position: relative; overflow: hidden; border-radius: calc(var(--radius-lg) * 1.6); background: var(--color-accent-2-200); padding: var(--space-8); display: flex; flex-direction: column; justify-content: flex-end; min-height: 520px"
    >
      <div style="position: absolute; width: 340px; height: 340px; border-radius: 50%; background: var(--color-accent-300); top: -90px; right: -70px"></div>
      <div style="position: absolute; width: 150px; height: 150px; border-radius: 50%; background: var(--color-accent-2-400); top: 170px; right: 210px"></div>
      <div style="position: relative; display: flex; flex-direction: column; gap: var(--space-3)">
        <h6 style="margin: 0; color: var(--color-accent-2-800)">Every image, five gates</h6>
        <div v-for="st in stages" :key="st.n" style="display: flex; align-items: center; gap: var(--space-3)">
          <span style="width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--color-bg); font-family: var(--font-heading); font-size: 16px; flex: none">{{ st.n }}</span>
          <div>
            <div style="font-family: var(--font-heading); font-size: 18px; line-height: 1.2">{{ st.name }}</div>
            <div style="font-size: 13px; color: var(--color-accent-2-800)">{{ st.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
