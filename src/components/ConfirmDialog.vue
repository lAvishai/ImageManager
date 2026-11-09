<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    body: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
  }>(),
  {
    confirmLabel: 'Approve',
    cancelLabel: 'Cancel',
    danger: false,
  },
)
const emit = defineEmits<{ cancel: []; confirm: [] }>()
</script>

<template>
  <div class="dialog-backdrop" style="z-index: 50" @click="emit('cancel')" @keydown.esc="emit('cancel')">
    <div class="dialog" role="alertdialog" aria-modal="true" @click.stop>
      <div class="dialog-title">{{ title }}</div>
      <div class="dialog-body">{{ body }}</div>
      <div class="dialog-actions">
        <button class="btn btn-ghost" type="button" @click="emit('cancel')">{{ cancelLabel }}</button>
        <button
          class="btn btn-primary"
          type="button"
          :style="danger ? 'background: #b23b3b; color: #fff; border-color: #b23b3b' : ''"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
