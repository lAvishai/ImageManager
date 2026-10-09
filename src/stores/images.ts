import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ImageItem {
  name: string
  path: string
  tags?: string[]
}

export const useImagesStore = defineStore('images', () => {
  const images = ref<ImageItem[]>([])

  // Reads metadata published alongside the site (served by GitHub Pages)
  async function load() {
    const res = await fetch(`${import.meta.env.BASE_URL}data/images.json`)
    if (res.ok) images.value = await res.json()
  }

  return { images, load }
})
