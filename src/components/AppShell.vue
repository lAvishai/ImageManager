<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Icon from './Icon.vue'
import RemarksDrawer from './RemarksDrawer.vue'
import { useAuthStore } from '../stores/auth'
import { useRecordsStore } from '../stores/records'
import { useUiStore } from '../stores/ui'

const auth = useAuthStore()
const store = useRecordsStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const top = ref('')
const bottom = ref('')
const invalid = computed(() => !(top.value.trim() && bottom.value.trim()))
const initials = computed(() => (auth.email.split('@')[0] || '?').slice(0, 2).toUpperCase())

function lock() {
  auth.lock()
  store.reset()
  ui.closeRemarks()
  router.replace('/login')
}
async function create() {
  const t = top.value.trim(), b = bottom.value.trim()
  top.value = bottom.value = ''
  ui.newOpen = false
  const id = await store.create(t, b)
  router.push(`/record/${id}`)
}
</script>

<template>
  <nav class="nav" style="padding: var(--space-4) clamp(16px, 4vw, var(--space-8)); flex-wrap: wrap; gap: var(--space-3); border-bottom: 2px solid var(--color-neutral-300); margin-bottom: var(--space-4)">
    <div style="display: flex; gap: var(--space-1); margin-right: auto">
      <h1 title="Back to pilgis" style="margin: 0; cursor: pointer" @click="router.push('/')">PilGi manager</h1>
    </div>
    <button class="btn btn-primary" @click="ui.newOpen = true"><Icon name="plus" />New PilGi</button>
    <button class="btn btn-secondary" @click="router.push('/import')"><Icon name="upload" />Import batch</button>
    <span class="text-muted" style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; min-width: 0; overflow-wrap: anywhere">
      <Icon name="branch" :size="14" />{{ auth.repo }} · {{ auth.branch }}
    </span>
    <span style="display: inline-flex; align-items: center; gap: var(--space-2); font-size: 13px">
      <span style="width: 30px; height: 30px; border-radius: 50%; background: var(--color-accent-200); color: var(--color-accent-800); display: grid; place-items: center; font-weight: 700; font-size: 12px">{{ initials }}</span>
      {{ auth.email }}
    </span>
    <button
      class="btn btn-icon"
      :class="route.path === '/settings' ? 'btn-primary' : 'btn-secondary'"
      title="Settings"
      aria-label="Settings"
      @click="router.push('/settings')"
    >
      <Icon name="gear" />
    </button>
    <button class="btn btn-secondary btn-icon" title="Lock" @click="lock"><Icon name="lock" /></button>
  </nav>

  <div v-if="!store.loaded" class="text-muted" style="padding: var(--space-8)">Loading pilgis from {{ auth.repo }}…</div>
  <div v-else-if="store.loadError" style="margin: var(--space-6) clamp(16px, 4vw, var(--space-8)); padding: var(--space-6); border-radius: calc(var(--radius-lg) * 1.3); background: var(--color-accent-100); max-width: 640px">
    <h3 style="margin: 0 0 var(--space-2)">Can't load your repository</h3>
    <p style="margin: 0 0 var(--space-4); overflow-wrap: anywhere">{{ store.loadError }}</p>
    <div style="display: flex; gap: var(--space-2)">
      <button class="btn btn-primary" @click="store.init()">Retry</button>
      <button class="btn btn-secondary" @click="lock">Lock &amp; change repository</button>
    </div>
  </div>
  <RouterView v-else />

  <RemarksDrawer />

  <div v-if="ui.newOpen" class="dialog-backdrop" style="z-index: 50" @click="ui.newOpen = false">
    <div class="dialog" style="width: min(520px, 100%)" @click.stop>
      <div class="dialog-title">New scenario</div>
      <div class="field"><label>Top sentence</label><input v-model="top" class="input" /></div>
      <div class="field"><label>Bottom sentence</label><input v-model="bottom" class="input" /></div>
      <div class="dialog-actions">
        <button class="btn btn-ghost" @click="ui.newOpen = false">Cancel</button>
        <button class="btn btn-primary" :disabled="invalid" @click="create">Create PilGi</button>
      </div>
    </div>
  </div>

  <div v-if="store.toastMsg" style="position: fixed; left: var(--space-8); bottom: var(--space-6); z-index: 60; display: flex; align-items: center; gap: var(--space-2); padding: 10px 18px; border-radius: 999px; background: var(--color-neutral-900); color: var(--color-bg); font-size: 13px; box-shadow: var(--shadow-lg)">
    <Icon name="commit" :size="15" />{{ store.toastMsg }}
  </div>
</template>
