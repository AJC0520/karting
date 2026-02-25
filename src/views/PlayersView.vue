<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import PlayerForm from '@/components/PlayerForm.vue'
import StatsCards from '@/components/StatsCards.vue'
import TournamentTabs from '@/components/TournamentTabs.vue'
import { useAppStore } from '@/stores/appStore'
import { formatDateTime, formatNumber } from '@/utils/format'
import { getPlayerStats } from '@/utils/stats'
import type { Player } from '@/types'

const route = useRoute()
const store = useAppStore()

const tournament = computed(() => store.getTournamentById(route.params.id as string))
const showArchived = ref(false)
const editingPlayer = ref<Player | null>(null)
const selectedPlayerId = ref<string | null>(null)

const visiblePlayers = computed(() => {
  if (!tournament.value) return []
  return tournament.value.players.filter((player) => (showArchived.value ? true : !player.archived))
})

const selectPlayer = (player: Player) => {
  selectedPlayerId.value = player.id
}

const selectedPlayer = computed(() => {
  if (!tournament.value || !selectedPlayerId.value) return null
  return tournament.value.players.find((player) => player.id === selectedPlayerId.value) ?? null
})

const playerStats = computed(() => {
  if (!tournament.value || !selectedPlayer.value) return null
  return getPlayerStats(tournament.value, selectedPlayer.value.id)
})

const hasHistory = (playerId: string) => {
  if (!tournament.value) return false
  return tournament.value.races.some((race) => race.placements.includes(playerId))
}

const startEdit = (player: Player) => {
  editingPlayer.value = player
}

const cancelEdit = () => {
  editingPlayer.value = null
}

const savePlayer = (payload: { name: string; nickname?: string; initialPoints?: number }) => {
  if (!tournament.value) return
  store.addPlayer(tournament.value.id, payload)
}

const updatePlayer = (payload: { name: string; nickname?: string; initialPoints?: number }) => {
  if (!tournament.value || !editingPlayer.value) return
  store.updatePlayer(tournament.value.id, editingPlayer.value.id, payload)
  editingPlayer.value = null
}

const archivePlayer = (player: Player, archived: boolean) => {
  if (!tournament.value) return
  store.archivePlayer(tournament.value.id, player.id, archived)
}

const removePlayer = (player: Player) => {
  if (!tournament.value) return
  if (!confirm(`Delete ${player.name}?`)) return
  store.removePlayer(tournament.value.id, player.id)
}
</script>

<template>
  <section v-if="tournament" class="space-y-8">
    <header class="space-y-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-muted">Players</p>
        <h2 class="text-3xl font-semibold">{{ tournament.name }}</h2>
      </div>
      <TournamentTabs />
    </header>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="card p-6">
        <h3 class="section-title">Add player</h3>
        <PlayerForm
          class="mt-4"
          :default-initial-points="tournament.settings.initialPoints"
          submit-label="Add player"
          @save="savePlayer"
          @cancel="() => {}"
        />
      </div>

      <div v-if="editingPlayer" class="card p-6">
        <h3 class="section-title">Edit player</h3>
        <PlayerForm
          class="mt-4"
          :player="editingPlayer"
          :default-initial-points="tournament.settings.initialPoints"
          submit-label="Update player"
          @save="updatePlayer"
          @cancel="cancelEdit"
        />
      </div>
    </div>

    <div class="flex items-center gap-3">
      <label class="flex items-center gap-2 text-sm">
        <input v-model="showArchived" type="checkbox" />
        Show archived players
      </label>
    </div>

    <div class="card p-4">
      <div class="grid grid-cols-12 gap-2 border-b border-black/5 px-2 py-3 text-xs font-semibold uppercase text-muted">
        <span class="col-span-4">Player</span>
        <span class="col-span-2">Initial</span>
        <span class="col-span-2">Status</span>
        <span class="col-span-4 text-right">Actions</span>
      </div>
      <div
        v-for="player in visiblePlayers"
        :key="player.id"
        class="grid grid-cols-12 gap-2 border-b border-black/5 px-2 py-3 text-sm last:border-b-0"
      >
        <button class="col-span-4 text-left font-semibold hover:text-primary" @click="selectPlayer(player)">
          {{ player.name }}
          <span v-if="player.nickname" class="text-xs text-muted">({{ player.nickname }})</span>
        </button>
        <span class="col-span-2 text-muted">
          {{ player.initialPoints ?? tournament.settings.initialPoints }}
        </span>
        <span class="col-span-2 text-muted">{{ player.archived ? 'Archived' : 'Active' }}</span>
        <div class="col-span-4 flex justify-end gap-2">
          <button class="btn btn-ghost text-xs" type="button" @click="startEdit(player)">Edit</button>
          <button
            v-if="!hasHistory(player.id)"
            class="btn btn-ghost text-xs text-red-600"
            type="button"
            @click="removePlayer(player)"
          >
            Delete
          </button>
          <button
            v-else
            class="btn btn-ghost text-xs"
            type="button"
            @click="archivePlayer(player, !player.archived)"
          >
            {{ player.archived ? 'Unarchive' : 'Archive' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="selectedPlayer && playerStats" class="space-y-4">
      <h3 class="section-title">{{ selectedPlayer.name }} stats</h3>
      <StatsCards
        :items="[
          { label: 'Wins', value: playerStats.wins },
          { label: 'Podiums', value: playerStats.podiums },
          { label: 'Average finish', value: formatNumber(playerStats.avgFinish, 2) },
          { label: 'Total races', value: playerStats.totalRaces },
        ]"
      />
      <div class="grid gap-4 md:grid-cols-2">
        <div class="card p-4">
          <h4 class="text-sm font-semibold">Best / worst</h4>
          <div class="mt-2 flex items-center gap-4 text-sm">
            <span class="badge">Best: {{ playerStats.bestFinish || '—' }}</span>
            <span class="badge">Worst: {{ playerStats.worstFinish || '—' }}</span>
          </div>
          <div class="mt-3 text-xs text-muted">
            Win streak: current {{ playerStats.currentWinStreak }} · longest {{ playerStats.longestWinStreak }}
          </div>
        </div>
        <div class="card p-4">
          <h4 class="text-sm font-semibold">Recent form</h4>
          <div v-if="playerStats.recentForm.length" class="mt-2 space-y-2 text-sm">
            <div
              v-for="entry in playerStats.recentForm"
              :key="entry.raceId"
              class="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2"
            >
              <span>#{{ entry.finish }}</span>
              <span class="text-xs text-muted">{{ formatDateTime(entry.timestamp) }}</span>
              <span class="font-semibold">+{{ formatNumber(entry.points, 2) }}</span>
            </div>
          </div>
          <p v-else class="mt-2 text-xs text-muted">No races yet.</p>
        </div>
      </div>
    </div>
  </section>

  <section v-else class="card p-6 text-sm text-muted">
    Tournament not found. Choose one from the sidebar.
  </section>
</template>
