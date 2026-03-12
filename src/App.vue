<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import TopNav from '@/components/TopNav.vue'
import TournamentSidebar from '@/components/TournamentSidebar.vue'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'

const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

const isAuthRoute = computed(() => route.path === '/login' || route.path === '/signup')
const isHomeRoute = computed(() => route.path === '/')
const isTournamentRoute = computed(() => route.path.startsWith('/t/'))

onMounted(async () => {
  await authStore.initialize()
  if (authStore.isAuthenticated) {
    await appStore.loadTournaments()
  }
})

watch(() => authStore.isAuthenticated, async (isAuth) => {
  if (isAuth) {
    await appStore.loadTournaments()
  } else {
    appStore.tournaments = []
  }
})
</script>

<template>
  <!-- Auth pages (login/signup) — full page, no chrome -->
  <template v-if="isAuthRoute">
    <RouterView />
  </template>

  <!-- Home splash — full screen, no nav -->
  <template v-else-if="isHomeRoute">
    <RouterView />
  </template>

  <!-- Inner app pages — sky background + top nav -->
  <template v-else>
    <div
      class="min-h-screen bg-cover bg-center bg-fixed"
      style="background-color: lightblue;"
    >
      <!-- Subtle dark overlay for nav readability -->
      <div class="min-h-screen bg-black/10">
        <TopNav />
        <div style="padding-top: 5rem;" class="px-6 pb-6 lg:px-10 lg:pb-10">
          <!-- Tournament pages: sidebar + content -->
          <div v-if="isTournamentRoute" class="flex gap-6 items-start">
            <TournamentSidebar />
            <main class="flex-1 min-w-0">
              <RouterView />
            </main>
          </div>
          <!-- All other pages -->
          <main v-else>
            <RouterView />
          </main>
        </div>
      </div>
    </div>
  </template>
</template>
