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
  { label: 'Leaderboard', to: `/t/${tournamentId.value}/leaderboard` },
  { label: 'Map', to: `/t/${tournamentId.value}/map` },
  { label: 'Races', to: `/t/${tournamentId.value}/races` },
  { label: 'Add Race', to: `/t/${tournamentId.value}/add-race` },
  { label: 'Players', to: `/t/${tournamentId.value}/players` },
])
</script>

<template>
  <aside class="w-56 shrink-0">
    <div class="card sidebar-panel p-3">
      <p class="px-2 text-xs font-semibold uppercase tracking-wide text-muted">Tournament</p>
      <p class="mb-3 px-2 text-sm font-semibold text-ink truncate">
        {{ currentTournament?.name ?? 'Loading...' }}
      </p>

      <nav class="space-y-1">
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

      <div v-if="otherTournaments.length" class="mt-4 border-t border-black/10 pt-3">
        <p class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Switch Tournament
        </p>
        <div class="space-y-1">
          <RouterLink
            v-for="t in otherTournaments"
            :key="t.id"
            :to="`/t/${t.id}/leaderboard`"
            class="sidebar-link"
          >
            {{ t.name }}
          </RouterLink>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-panel {
  position: fixed;
  top: 50%;
  left: 1.5rem;
  width: 14rem;
  transform: translateY(-50%);
}

@media (min-width: 1024px) {
  .sidebar-panel {
    left: 2.5rem;
  }
}

.sidebar-link {
  display: block;
  border-radius: 0.65rem;
  padding: 0.45rem 0.55rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgb(18 24 40);
  text-decoration: none;
  transition: background-color 120ms ease, color 120ms ease;
}

.sidebar-link:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.sidebar-link-active {
  background-color: rgba(200, 30, 30, 0.12);
  color: rgb(165 28 28);
}
</style>
