<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import PodiumGraph from '@/components/PodiumGraph.vue'
import StatsCards from '@/components/StatsCards.vue'
import TournamentTabs from '@/components/TournamentTabs.vue'
import { useAppStore } from '@/stores/appStore'
import { formatNumber, formatDateTime } from '@/utils/format'
import { getLeaderboard, getTournamentStats } from '@/utils/stats'

const route = useRoute()
const store = useAppStore()

const tournament = computed(() => store.getTournamentById(route.params.id as string))

const leaderboard = computed(() => (tournament.value ? getLeaderboard(tournament.value) : []))
const showArchived = ref(true)

const filteredLeaderboard = computed(() => {
  if (showArchived.value) return leaderboard.value
  return leaderboard.value.filter((entry) => !entry.player.archived)
})

const topThree = computed(() => filteredLeaderboard.value.slice(0, 3))
const restOfLeaderboard = computed(() => filteredLeaderboard.value.slice(3))

// Reorder for podium display: [2nd, 1st, 3rd]
const podiumOrder = computed(() => {
  const top = topThree.value
  if (top.length === 0) return []
  if (top.length === 1) return [top[0]]
  if (top.length === 2) return [top[1], top[0]]
  return [top[1], top[0], top[2]] // 2nd, 1st, 3rd
})

const getPodiumHeight = (rank: number) => {
  if (rank === 1) return 'h-48'
  if (rank === 2) return 'h-36'
  if (rank === 3) return 'h-28'
  return 'h-32'
}

const getRankColor = (rank: number) => {
  if (rank === 1) return 'bg-amber-400 text-amber-950'
  if (rank === 2) return 'bg-slate-300 text-slate-950'
  if (rank === 3) return 'bg-orange-600 text-orange-50'
  return 'bg-zinc-700'
}

const leaderGap = computed(() => {
  if (leaderboard.value.length < 2) return 0
  return leaderboard.value[1].gapToLeader
})

const stats = computed(() => (tournament.value ? getTournamentStats(tournament.value) : null))

const topWinRate = computed(() => {
  if (!stats.value) return null
  const sorted = [...stats.value.winRates].sort((a, b) => b.rate - a.rate)
  return sorted.find((entry) => entry.total > 0) ?? null
})

const longestStreak = computed(() => {
  if (!stats.value) return null
  return [...stats.value.streaks].sort((a, b) => b.longest - a.longest)[0] ?? null
})
</script>

<template>
  <section v-if="tournament" class="space-y-8">
    <header class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-muted">Leaderboard</p>
          <h2 class="text-3xl font-semibold">{{ tournament.name }}</h2>
        </div>
        <div class="text-sm text-muted">
          <span v-if="leaderGap">Leading by {{ formatNumber(leaderGap, 2) }} points</span>
          <span v-else>No races yet</span>
        </div>
      </div>
      <TournamentTabs />
    </header>

    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm">
        <input v-model="showArchived" type="checkbox" />
        Show archived players
      </label>
    </div>

    <!-- Podium Display -->
    <div v-if="topThree.length > 0" class="card p-8">
      <div class="flex items-end justify-center gap-4 max-w-3xl mx-auto">
        <div
          v-for="entry in podiumOrder"
          :key="entry.player.id"
          class="flex-1 flex flex-col items-center"
        >
          <!-- Player Info -->
          <div class="text-center mb-4 space-y-2">
            <div class="text-4xl font-bold mb-2" :class="entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-300' : 'text-orange-600'">
              {{ entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉' }}
            </div>
            <p class="font-semibold text-lg">{{ entry.player.name }}</p>
            <p v-if="entry.player.nickname" class="text-xs text-muted">({{ entry.player.nickname }})</p>
            <div class="mt-3 space-y-1">
              <p class="text-2xl font-bold">{{ formatNumber(entry.totalPoints, 2) }}</p>
              <p class="text-xs text-muted">total points</p>
            </div>
            <div class="flex gap-4 justify-center text-xs mt-2">
              <div>
                <p class="font-semibold">{{ formatNumber(entry.avgPointsPerRace, 2) }}</p>
                <p class="text-muted">avg/race</p>
              </div>
              <div v-if="entry.gapToLeader > 0">
                <p class="font-semibold">{{ formatNumber(entry.gapToLeader, 2) }}</p>
                <p class="text-muted">gap</p>
              </div>
            </div>
          </div>
          
          <!-- Podium Block -->
          <div 
            class="w-full rounded-t-lg flex flex-col items-center justify-center transition-all"
            :class="[getPodiumHeight(entry.rank), getRankColor(entry.rank)]"
          >
            <div class="text-3xl font-bold">{{ entry.rank }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Position Performance Graph -->
    <PodiumGraph v-if="tournament" :tournament="tournament" />
    
    <!-- Rest of Leaderboard (4th place and below) -->
    <div v-if="restOfLeaderboard.length > 0" class="card overflow-hidden">
        <div class="grid grid-cols-12 gap-2 border-b border-black/5 bg-black/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
          <span class="col-span-1">Rank</span>
          <span class="col-span-3">Player</span>
          <span class="col-span-2">Total</span>
          <span class="col-span-2">Avg/Race</span>
          <span class="col-span-2">Last Race</span>
          <span class="col-span-2">Gap</span>
        </div>
        <div
          v-for="entry in restOfLeaderboard"
          :key="entry.player.id"
          class="grid grid-cols-12 gap-2 border-b border-black/5 px-4 py-3 text-sm last:border-b-0"
        >
          <span class="col-span-1 font-semibold">{{ entry.rank }}</span>
          <div class="col-span-3">
            <p class="font-semibold">
              {{ entry.player.name }}
              <span v-if="entry.player.nickname" class="text-xs text-muted">({{ entry.player.nickname }})</span>
            </p>
            <p v-if="entry.player.archived" class="text-xs text-muted">Archived</p>
          </div>
          <span class="col-span-2 font-semibold">{{ formatNumber(entry.totalPoints, 2) }}</span>
          <span class="col-span-2">{{ formatNumber(entry.avgPointsPerRace, 2) }}</span>
          <span class="col-span-2">{{ formatNumber(entry.lastRacePoints, 2) }}</span>
          <span class="col-span-2 text-muted">
            {{ entry.gapToLeader ? formatNumber(entry.gapToLeader, 2) : '—' }}
          </span>
        </div>
      </div>

    <div v-if="stats" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="section-title">Tournament snapshot</h3>
        <span class="text-xs text-muted">{{ stats.totalRaces }} total races · {{ stats.uniqueTracks }} unique tracks</span>
      </div>
      <StatsCards
        :items="[
          {
            label: 'Most played track',
            value: stats.mostPlayedTrack?.track ?? '—',
            helper: stats.mostPlayedTrack ? `${stats.mostPlayedTrack.count} races` : undefined,
          },
          {
            label: 'Closest race',
            value: stats.closestRace ? formatNumber(stats.closestRace.spread, 2) : '—',
            helper: stats.closestRace ? `${stats.closestRace.track} · ${formatDateTime(stats.closestRace.timestamp)}` : undefined,
          },
          {
            label: 'Top win rate',
            value: topWinRate?.player.name ?? '—',
            helper: topWinRate ? `${topWinRate.wins} wins in ${topWinRate.total} races` : undefined,
          },
          {
            label: 'Longest streak',
            value: longestStreak?.longest ?? 0,
            helper: longestStreak?.player.name ?? '—',
          },
        ]"
      />
      
      <div class="mt-6 flex items-center justify-between">
        <h3 class="section-title">Player achievements</h3>
      </div>
      <StatsCards
        :items="[
          {
            label: 'Most consistent',
            value: stats.mostConsistent?.player.name ?? '—',
            helper: stats.mostConsistent ? `${stats.mostConsistent.gap} position gap` : undefined,
            description: 'Player with the smallest gap between their best and worst finishing positions',
          },
          {
            label: 'Podium king',
            value: stats.podiumKing?.player.name ?? '—',
            helper: stats.podiumKing ? `${formatNumber(stats.podiumKing.percentage, 1)}% podiums` : undefined,
            description: 'Player with the highest percentage of podium finishes (top 3 positions)',
          },
          {
            label: 'Average points per race',
            value: stats.avgPointsPerRace?.player.name ?? '—',
            helper: stats.avgPointsPerRace ? `${formatNumber(stats.avgPointsPerRace.avgPoints, 1)} pts/race` : undefined,
            description: 'Player with the highest average points scored per race',
          },
          {
            label: 'Blue Shell Victim',
            value: stats.blueShellVictim?.player.name ?? '—',
            helper: stats.blueShellVictim ? `${stats.blueShellVictim.secondPlaces} second places` : undefined,
            description: 'Player with the most 2nd place finishes (so close!)',
          },
        ]"
      />
    </div>
  </section>

  <section v-else class="card p-6 text-sm text-muted">
    Tournament not found. Choose one from the sidebar.
  </section>
</template>
