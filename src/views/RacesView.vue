<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RaceForm from '@/components/RaceForm.vue'
import RaceList from '@/components/RaceList.vue'
import TournamentTabs from '@/components/TournamentTabs.vue'
import { useAppStore } from '@/stores/appStore'
import type { Race } from '@/types'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const tournament = computed(() => store.getTournamentById(route.params.id as string))

const selectedPlayer = ref('')
const trackFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const editingRaceId = ref<string | null>(null)

const filteredRaces = computed(() => {
  if (!tournament.value) return []
  return tournament.value.races.filter((race) => {
    if (selectedPlayer.value && !race.placements.includes(selectedPlayer.value)) return false
    if (trackFilter.value && !race.track.toLowerCase().includes(trackFilter.value.toLowerCase())) return false
    if (dateFrom.value) {
      const from = new Date(dateFrom.value).getTime()
      if (new Date(race.timestamp).getTime() < from) return false
    }
    if (dateTo.value) {
      const to = new Date(dateTo.value).getTime()
      if (new Date(race.timestamp).getTime() > to) return false
    }
    return true
  })
})

const raceBeingEdited = computed(() => {
  if (!tournament.value || !editingRaceId.value) return null
  return tournament.value.races.find((race) => race.id === editingRaceId.value) ?? null
})

const startEdit = (race: Race) => {
  editingRaceId.value = race.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const cancelEdit = () => {
  editingRaceId.value = null
}

const saveEdit = (race: Race) => {
  if (!tournament.value) return
  store.updateRace(tournament.value.id, race.id, race)
  editingRaceId.value = null
}

const deleteRace = (race: Race) => {
  if (!tournament.value) return
  if (!confirm(`Delete race on "${race.track}"?`)) return
  store.deleteRace(tournament.value.id, race.id)
}
</script>

<template>
  <section v-if="tournament" class="space-y-8">
    <header class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-3xl font-semibold">{{ tournament.name }}</h2>
        </div>
        <button class="btn btn-primary" type="button" @click="router.push(`/t/${tournament.id}/add-race`)">
          Add race
        </button>
      </div>
      <TournamentTabs />
    </header>

    <div class="card p-4">
      <div class="grid gap-3 md:grid-cols-4">
        <div>
          <label class="text-xs uppercase tracking-wide text-muted">Player</label>
          <select v-model="selectedPlayer" class="select mt-2">
            <option value="">All players</option>
            <option v-for="player in tournament.players" :key="player.id" :value="player.id">
              {{ player.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="text-xs uppercase tracking-wide text-muted">Track</label>
          <input v-model="trackFilter" class="input mt-2" placeholder="Search track" />
        </div>
        <div>
          <label class="text-xs uppercase tracking-wide text-muted">From</label>
          <input v-model="dateFrom" class="input mt-2" type="date" />
        </div>
        <div>
          <label class="text-xs uppercase tracking-wide text-muted">To</label>
          <input v-model="dateTo" class="input mt-2" type="date" />
        </div>
      </div>
    </div>

    <div v-if="raceBeingEdited" class="card p-6">
      <h3 class="section-title">Edit race</h3>
      <RaceForm
        class="mt-4"
        :tournament="tournament"
        :race="raceBeingEdited"
        submit-label="Update race"
        @save="saveEdit"
        @cancel="cancelEdit"
      />
    </div>

    <div v-if="!filteredRaces.length" class="card p-6 text-sm text-muted">
      No races match the current filters.
    </div>

    <RaceList v-else :tournament="tournament" :races="filteredRaces" @edit="startEdit" @delete="deleteRace" />
  </section>

  <section v-else class="card p-6 text-sm text-muted">
    Tournament not found. Choose one from the sidebar.
  </section>
</template>
