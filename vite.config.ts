import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' keeps asset paths relative so it works under /<repo>/ on GitHub Pages
export default defineConfig({
  base: './',
  plugins: [vue()],
})
