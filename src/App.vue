<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'

const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

// Check if current route requires auth
const isAuthRoute = computed(() => route.path === '/login' || route.path === '/signup')

onMounted(async () => {
  await authStore.initialize()
  if (authStore.isAuthenticated) {
    await appStore.loadTournaments()
  }
})

// Reload tournaments when auth state changes
watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await appStore.loadTournaments()
  } else {
    appStore.tournaments = []
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-[#f7f4ee] via-[#f0f7f9] to-[#fdf1e7] text-ink">
    <!-- Show auth pages without sidebar -->
    <template v-if="isAuthRoute">
      <RouterView />
    </template>
    <!-- Show app with sidebar when authenticated -->
    <template v-else>
      <div class="app-shell">
        <Sidebar />
        <main class="flex-1 p-6 lg:p-10">
          <RouterView />
        </main>
      </div>
      <a
        href="https://github.com/AJC0520/karting"
        target="_blank"
        rel="noopener noreferrer"
        class="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:shadow-md"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M12 2C6.477 2 2 6.59 2 12.253c0 4.53 2.865 8.377 6.839 9.734.5.096.682-.22.682-.49 0-.242-.009-.884-.014-1.736-2.782.62-3.369-1.36-3.369-1.36-.455-1.188-1.11-1.505-1.11-1.505-.907-.64.069-.627.069-.627 1.003.072 1.531 1.058 1.531 1.058.892 1.563 2.341 1.112 2.91.85.091-.668.35-1.112.636-1.367-2.22-.261-4.555-1.14-4.555-5.072 0-1.12.39-2.034 1.03-2.75-.103-.26-.446-1.308.098-2.727 0 0 .84-.275 2.75 1.05A9.37 9.37 0 0 1 12 7.07c.85.004 1.705.118 2.504.346 1.909-1.325 2.748-1.05 2.748-1.05.545 1.419.202 2.467.099 2.727.64.716 1.029 1.63 1.029 2.75 0 3.943-2.338 4.808-4.566 5.064.359.318.679.944.679 1.904 0 1.374-.013 2.48-.013 2.818 0 .272.18.59.688.488C19.137 20.626 22 16.78 22 12.253 22 6.59 17.523 2 12 2z"
          />
        </svg>
        GitHub
      </a>
    </template>
  </div>
</template>
