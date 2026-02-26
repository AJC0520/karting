<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RaceForm from '@/components/RaceForm.vue'
import TournamentTabs from '@/components/TournamentTabs.vue'
import { useAppStore } from '@/stores/appStore'
import type { Race } from '@/types'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const tournament = computed(() => store.getTournamentById(route.params.id as string))

const saveRace = (race: Race) => {
  if (!tournament.value) return
  store.addRace(tournament.value.id, race)
  router.push(`/t/${tournament.value.id}/races`)
}
</script>

<template>
  <section v-if="tournament" class="space-y-8">
    <header class="space-y-4">
      <div>
        <h2 class="text-3xl font-semibold">{{ tournament.name }}</h2>
      </div>
      <TournamentTabs />
    </header>

    <div class="card p-6">
      <RaceForm :tournament="tournament" submit-label="Add race" @save="saveRace" @cancel="router.back" />
    </div>
  </section>

  <section v-else class="card p-6 text-sm text-muted">
    Tournament not found. Choose one from the sidebar.
  </section>
</template>
