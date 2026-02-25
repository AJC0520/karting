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
    </template>
  </div>
</template>
