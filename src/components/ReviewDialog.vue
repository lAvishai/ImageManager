<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  title: string
  body: string
  commentLabel: string
  placeholder: string
  confirmLabel: string
  required?: boolean
}>()
const emit = defineEmits<{ cancel: []; confirm: [comment: string] }>()

const comment = ref('')
const err = ref(false)

function confirm() {
  if (props.required && !comment.value.trim()) {
    err.value = true
    return
  }
  emit('confirm', comment.value.trim())
}
</script>

<template>
  <div class="dialog-backdrop" style="z-index: 50" @click="emit('cancel')">
    <div class="dialog" @click.stop>
      <div class="dialog-title">{{ title }}</div>
      <div class="dialog-body">{{ body }}</div>
      <div class="field">
        <label>{{ commentLabel }}</label>
        <textarea v-model="comment" class="input" :placeholder="placeholder" style="border-radius: var(--radius-md)" @input="err = false"></textarea>
      </div>
      <span v-if="err" style="font-size: 13px; color: var(--color-accent-700)">Add a comment so the creator knows what to change.</span>
      <div class="dialog-actions">
        <button class="btn btn-ghost" @click="emit('cancel')">Cancel</button>
        <button class="btn btn-primary" @click="confirm">{{ confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>
