<script setup lang="ts">
import { computed } from 'vue'

import type { Race, Tournament } from '@/types'
import { computeRacePoints } from '@/utils/scoring'
import { formatDateTime, formatNumber } from '@/utils/format'

const props = defineProps<{
  tournament: Tournament
  races: Race[]
}>()

const emit = defineEmits<{
  (event: 'edit', race: Race): void
  (event: 'delete', race: Race): void
}>()

const tournament = computed(() => props.tournament)
const playerMap = computed(() => new Map(props.tournament.players.map((player) => [player.id, player])))

const displayRaces = computed(() => {
  return [...props.races].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
})

const getStatus = (race: Race, playerId: string) => race.status?.[playerId] ?? 'ok'
</script>

<template>
  <div class="space-y-4">
    <div v-for="race in displayRaces" :key="race.id" class="card p-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold">{{ race.track }}</h3>
          <p class="text-sm text-muted">{{ formatDateTime(race.timestamp) }}</p>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost text-xs" type="button" @click="emit('edit', race)">Edit</button>
          <button class="btn btn-ghost text-xs text-red-600" type="button" @click="emit('delete', race)">
            Delete
          </button>
        </div>
      </div>

      <div class="mt-4 grid gap-2">
        <div
          v-for="(playerId, index) in race.placements"
          :key="playerId"
          class="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 text-sm"
        >
          <div class="flex items-center gap-2">
            <span class="badge">#{{ index + 1 }}</span>
            <span class="font-semibold">{{ playerMap.get(playerId)?.name ?? 'Unknown' }}</span>
            <span v-if="getStatus(race, playerId) !== 'ok'" class="text-xs text-red-600">
              {{ getStatus(race, playerId).toUpperCase() }}
            </span>
          </div>
          <span class="text-sm text-muted">
            +{{ formatNumber(computeRacePoints(tournament, race)[playerId] ?? 0, 2) }}
          </span>
        </div>
      </div>

      <p v-if="race.notes" class="mt-3 text-sm text-muted">{{ race.notes }}</p>
    </div>
  </div>
</template>
