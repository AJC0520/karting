import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue'
import './styles.css'
import { routes } from './router'
import { useAuthStore } from './stores/authStore'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Wait for auth to initialize on first load
  if (authStore.loading) {
    await authStore.initialize()
  }

  const requiresAuth = to.meta.requiresAuth
  const requiresGuest = to.meta.requiresGuest
  const isAuthenticated = authStore.isAuthenticated

  if (requiresAuth && !isAuthenticated) {
    // Redirect to login if route requires auth and user is not authenticated
    next('/login')
  } else if (requiresGuest && isAuthenticated) {
    // Redirect to home if route requires guest and user is authenticated
    next('/')
  } else {
    next()
  }
})

app.use(router)

app.mount('#app')
