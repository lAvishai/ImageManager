<script setup lang="ts">
import { onMounted } from 'vue'
import { useImagesStore } from '../stores/images'

const store = useImagesStore()
onMounted(store.load)
</script>

<template>
  <p v-if="!store.images.length">No images yet.</p>
  <ul v-else>
    <li v-for="img in store.images" :key="img.path">{{ img.name }}</li>
  </ul>
</template>
