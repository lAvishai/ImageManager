<script setup lang="ts">
defineProps<{ title: string; body: string; confirmLabel: string }>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()
</script>

<template>
  <div class="dialog-backdrop" style="z-index: 50" @click="emit('cancel')" @keydown.esc="emit('cancel')">
    <div class="dialog" role="alertdialog" aria-modal="true" @click.stop>
      <div class="dialog-title">{{ title }}</div>
      <div class="dialog-body">{{ body }}</div>
      <div class="dialog-actions">
        <button class="btn btn-ghost" @click="emit('cancel')">Cancel</button>
        <button class="btn btn-primary" @click="emit('confirm')">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>
