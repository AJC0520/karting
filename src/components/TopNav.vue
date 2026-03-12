<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { ChevronDown } from 'lucide-vue-next'

const store = useAppStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const showDropdown = ref(false)
const showMobileMenu = ref(false)

const tournaments = computed(() => store.tournaments)
const activeId = computed(() => route.params.id as string | undefined)

const handleLogout = async () => {
  try {
    await authStore.signOut()
    router.push('/login')
  } catch (error) {
    console.error('Failed to sign out:', error)
  }
}

const navigateTo = (path: string) => {
  showDropdown.value = false
  showMobileMenu.value = false
  router.push(path)
}

const blurDropdown = () => {
  window.setTimeout(() => { showDropdown.value = false }, 150)
}
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-50 bg-black/75 backdrop-blur-md border-b-2 border-red-700/60">
    <div class="flex items-center justify-between px-6 py-3 gap-4">

      <!-- Logo -->
      <RouterLink to="/" class="font-mk text-3xl leading-none shrink-0">
        <span class="mk-text-orange" style="-webkit-text-stroke: 2px #A96800; text-shadow: 2px 2px 0 #5B2D00;">KART</span><span class="mk-text-red" style="-webkit-text-stroke: 2px #7A0000; text-shadow: 2px 2px 0 #3B0000;">TRACKER</span>
      </RouterLink>

      <!-- Desktop nav -->
      <div class="hidden md:flex items-center gap-2">
    
        </div>

       

      <!-- User info -->
      <div class="hidden md:flex items-center gap-3 shrink-0">
        <span class="text-white text-xs">{{ authStore.userEmail }}</span>
        <button
          class="font-mk text-xs text-red-400 hover:text-red-300 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors"
          @click="handleLogout"
        >
          LOGOUT
        </button>
      </div>

      <!-- Mobile burger -->
      <button
        class="md:hidden text-white p-2"
        @click="showMobileMenu = !showMobileMenu"
      >
        <div class="w-5 h-0.5 bg-white mb-1"></div>
        <div class="w-5 h-0.5 bg-white mb-1"></div>
        <div class="w-5 h-0.5 bg-white"></div>
      </button>
    </div>

    <!-- Mobile menu -->
    <div v-if="showMobileMenu" class="md:hidden bg-gray-900/95 border-t border-white/10 py-4 px-6 space-y-3">
      <RouterLink to="/tournaments" class="block text-white font-mk" @click="showMobileMenu = false">TOURNAMENTS</RouterLink>
      <RouterLink to="/create-tournament" class="block text-yellow-400 font-mk" @click="showMobileMenu = false">+ CREATE</RouterLink>
      <RouterLink to="/beeriokart" class="block text-white font-mk" @click="showMobileMenu = false">🍺 BEERIOKART</RouterLink>
      <div class="border-t border-white/10 pt-3 flex items-center justify-between">
        <span class="text-white/60 text-xs">{{ authStore.userEmail }}</span>
        <button class="text-red-400 font-mk text-xs" @click="handleLogout">LOGOUT</button>
      </div>
    </div>
  </nav>
</template>
