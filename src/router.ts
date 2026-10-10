import { createRouter, createWebHashHistory } from 'vue-router'
import AppShell from './components/AppShell.vue'
import { useAuthStore } from './stores/auth'

// Hash history: GitHub Pages has no SPA fallback for deep links
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
    {
      path: '/',
      component: AppShell,
      meta: { auth: true },
      children: [
        { path: '', name: 'dashboard', component: () => import('./views/DashboardView.vue') },
        { path: 'import', name: 'import', component: () => import('./views/ImportView.vue') },
        { path: 'record/:id', name: 'detail', component: () => import('./views/DetailView.vue') },
        { path: 'settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.unlocked) return '/login'
  if (to.name === 'login' && auth.unlocked) return '/'
})

export default router
