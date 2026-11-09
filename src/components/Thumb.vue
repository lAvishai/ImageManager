<script setup lang="ts">
import { computed } from 'vue'
import { extractGoogleDriveId } from '../domain'

const props = defineProps<{
  bg?: string
  fg?: string
  text?: boolean
  url?: string
  driveId?: string
}>()

const resolvedDriveId = computed(() => props.driveId || (props.url ? extractGoogleDriveId(props.url) : null))
</script>

<template>
  <iframe
    v-if="resolvedDriveId"
    :src="`https://drive.google.com/file/d/${resolvedDriveId}/preview`"
    width="100%"
    height="100%"
    style="display: block; width: 100%; height: 100%; border: 0"
    allow="autoplay"
    loading="lazy"
  ></iframe>
  <svg
    v-else-if="bg && fg"
    viewBox="0 0 160 120"
    preserveAspectRatio="xMidYMid slice"
    style="display: block; width: 100%; height: 100%"
  >
    <rect width="160" height="120" :fill="bg" />
    <circle cx="118" cy="38" r="20" :fill="fg" opacity="0.55" />
    <path d="M0 120 L48 62 L86 104 L112 78 L160 120 Z" :fill="fg" opacity="0.8" />
    <template v-if="text">
      <rect x="22" y="12" width="116" height="9" rx="4.5" fill="#fff" opacity="0.9" />
      <rect x="36" y="26" width="88" height="9" rx="4.5" fill="#fff" opacity="0.9" />
    </template>
  </svg>
</template>

