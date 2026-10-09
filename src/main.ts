import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '../_ds/organic-edb397d8-99a9-4c87-a5c7-bca9b56d9bc8/styles.css'

createApp(App).use(createPinia()).use(router).mount('#app')
