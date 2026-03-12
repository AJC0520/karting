<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/appStore'

const route = useRoute()
const store = useAppStore()

const tournamentId = computed(() => route.params.id as string)
const currentTournament = computed(() => store.getTournamentById(tournamentId.value))
const otherTournaments = computed(() =>
  store.tournaments.filter((t) => t.id !== tournamentId.value),
)

const links = computed(() => [
  { label: '🏆 Leaderboard', to: `/t/${tournamentId.value}/leaderboard` },
  { label: '🗺️ Map', to: `/t/${tournamentId.value}/map` },
  { label: '🏁 Races', to: `/t/${tournamentId.value}/races` },
  { label: '➕ Add Race', to: `/t/${tournamentId.value}/add-race` },
  { label: '👥 Players', to: `/t/${tournamentId.value}/players` },
])
</script>

<template>
  <aside class="w-56 shrink-0 flex flex-col gap-1 self-start sticky top-20">
    <!-- Tournament name -->
    <div class="px-3 py-2 mb-1">
      <p class="text-xs font-semibold text-white uppercase tracking-widest mb-1">Tournament</p>
      <p class="font-mk text-base section-title leading-tight truncate">
        {{ currentTournament?.name ?? '…' }}
      </p>
    </div>

    <!-- Nav links -->
    <nav class="flex flex-col gap-0.5">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="sidebar-link"
        :class="route.path === link.to ? 'sidebar-link-active' : ''"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <!-- Tournament switcher -->
    <div v-if="otherTournaments.length" class="mt-4 pt-4 border-t border-white/10">
      <p class="px-3 text-xs font-semibold text-white uppercase tracking-widest mb-2">
        Other Tournaments
      </p>
      <RouterLink
        v-for="t in otherTournaments"
        :key="t.id"
        :to="`/t/${t.id}/leaderboard`"
        class="sidebar-link text-white hover:text-white"
      >
        {{ t.name }}
      </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-link {
  @apply flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white transition-colors duration-150;
}
.sidebar-link-active {
  @apply bg-white/20 text-white font-semibold;
}
</style>
