<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import LeaderboardTable from '@/components/LeaderboardTable.vue'
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

    <LeaderboardTable :entries="filteredLeaderboard" />

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
          },
          {
            label: 'Podium king',
            value: stats.podiumKing?.player.name ?? '—',
            helper: stats.podiumKing ? `${formatNumber(stats.podiumKing.percentage, 1)}% podiums` : undefined,
          },
          {
            label: 'Average points per race',
            value: stats.avgPointsPerRace?.player.name ?? '—',
            helper: stats.avgPointsPerRace ? `${formatNumber(stats.avgPointsPerRace.avgPoints, 1)} pts/race` : undefined,
          },
        ]"
      />
      
      <div class="mt-6 flex items-center justify-between">
        <h3 class="section-title">Improvement & mastery</h3>
      </div>
      <StatsCards
        :items="[
          {
            label: 'Biggest comeback',
            value: stats.biggestComeback?.player.name ?? '—',
            helper: stats.biggestComeback ? `${formatNumber(stats.biggestComeback.firstAvg, 1)} → ${formatNumber(stats.biggestComeback.lastAvg, 1)} avg finish` : undefined,
          },
          {
            label: 'Most improved',
            value: stats.mostImproved?.player.name ?? '—',
            helper: stats.mostImproved ? `+${stats.mostImproved.improvement} position${stats.mostImproved.improvement > 1 ? 's' : ''} in standings` : undefined,
          },
          {
            label: 'Track master',
            value: stats.trackMaster?.player.name ?? '—',
            helper: stats.trackMaster ? `${stats.trackMaster.track} (avg: ${formatNumber(stats.trackMaster.avgFinish, 1)})` : undefined,
          },
        ]"
      />
    </div>
  </section>

  <section v-else class="card p-6 text-sm text-muted">
    Tournament not found. Choose one from the sidebar.
  </section>
</template>
