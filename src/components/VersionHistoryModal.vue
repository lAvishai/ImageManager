<script setup lang="ts">
import Icon from './Icon.vue'
import versionsData from '../data/versions.json'

interface VersionEntry {
  version: string
  date: string
  title: string
  changes: string[]
}

const versions = versionsData as VersionEntry[]

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div v-if="open" class="dialog-backdrop" style="z-index: 50" @click="emit('close')" @keydown.esc="emit('close')">
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      style="max-width: 640px; width: min(94vw, 640px); max-height: 85vh; display: flex; flex-direction: column; padding: 0; overflow: hidden"
      @click.stop
    >
      <!-- Dialog Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--color-divider)">
        <div style="display: flex; align-items: center; gap: var(--space-3)">
          <span style="width: 32px; height: 32px; border-radius: 50%; background: var(--color-accent-200); color: var(--color-accent-800); display: grid; place-items: center; font-weight: 700; font-size: 13px">v</span>
          <div>
            <h3 style="margin: 0; font-size: 18px; line-height: 1.2">Version History</h3>
            <span class="text-muted" style="font-size: 12px">List of changes and features across releases</span>
          </div>
        </div>
        <button
          class="btn btn-ghost"
          style="padding: 6px; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center"
          aria-label="Close"
          title="Close"
          @click="emit('close')"
        >
          <Icon name="x" :size="16" />
        </button>
      </div>

      <!-- Scrollable Version List -->
      <div style="flex: 1; overflow-y: auto; padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-5)">
        <div
          v-for="(ver, idx) in versions"
          :key="ver.version"
          style="display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-4); border-radius: var(--radius-lg); background: var(--color-surface); border: 1px solid var(--color-divider)"
        >
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2)">
            <div style="display: flex; align-items: center; gap: var(--space-2)">
              <span class="tag" :class="idx === 0 ? 'tag-accent' : 'tag-neutral'" style="font-weight: 700; font-size: 12px">
                {{ ver.version }}
              </span>
              <span v-if="idx === 0" class="tag tag-accent-2" style="font-size: 10px; font-weight: 600; text-transform: uppercase">Latest</span>
              <strong style="font-size: 14px">{{ ver.title }}</strong>
            </div>
            <span class="text-muted" style="font-size: 12px">{{ ver.date }}</span>
          </div>

          <ul style="margin: var(--space-1) 0 0; padding-left: 20px; font-size: 13px; line-height: 1.5; color: var(--color-neutral-800)">
            <li v-for="(change, cIdx) in ver.changes" :key="cIdx" style="margin-bottom: 3px">
              {{ change }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Dialog Footer -->
      <div style="display: flex; justify-content: flex-end; padding: var(--space-4) var(--space-6); border-top: 1px solid var(--color-divider); background: var(--color-bg)">
        <button class="btn btn-secondary" type="button" @click="emit('close')">
          Close
        </button>
      </div>
    </div>
  </div>
</template>
