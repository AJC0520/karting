<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import PodiumGraph from '@/components/PodiumGraph.vue'
import StatsCards from '@/components/StatsCards.vue'
import { useAppStore } from '@/stores/appStore'
import { formatNumber } from '@/utils/format'
import { getLeaderboard, getTournamentStats } from '@/utils/stats'

const route = useRoute()
const store = useAppStore()

const tournament = computed(() => store.getTournamentById(route.params.id as string))

const leaderboard = computed(() => (tournament.value ? getLeaderboard(tournament.value) : []))

const filteredLeaderboard = computed(() => {
  return leaderboard.value
})

const topFour = computed(() => filteredLeaderboard.value.slice(0, 4))

// Reorder for podium display: [2nd, 1st, 3rd, 4th]
const podiumOrder = computed(() => {
  const top = topFour.value
  if (top.length === 0) return []
  if (top.length === 1) return [top[0]]
  if (top.length === 2) return [top[1], top[0]]
  if (top.length === 3) return [top[1], top[0], top[2]] // 2nd, 1st, 3rd
  return [top[1], top[0], top[2], top[3]] // 2nd, 1st, 3rd, 4th
})

const podiumScale = computed(() => {
  const entries = topFour.value
  if (entries.length === 0) return { minPoints: 0, maxPoints: 0 }
  const points = entries.map((entry) => entry.totalPoints)
  return {
    minPoints: Math.min(...points),
    maxPoints: Math.max(...points),
  }
})

const getPodiumHeight = (points: number) => {
  const minHeight = 80
  const maxHeight = 200
  const { minPoints, maxPoints } = podiumScale.value
  if (maxPoints === minPoints) return maxHeight
  const ratio = (points - minPoints) / (maxPoints - minPoints)
  return Math.round(minHeight + ratio * (maxHeight - minHeight))
}

const getRankColor = (rank: number) => {
  if (rank === 1) return 'bg-amber-400 text-amber-950'
  if (rank === 2) return 'bg-slate-300 text-slate-950'
  if (rank === 3) return 'bg-orange-600 text-orange-50'
  if (rank === 4) return 'bg-zinc-400 text-zinc-950'
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

    <!-- Podium Display -->
    <div v-if="topFour.length > 0" class="card p-8">
      <span v-if="leaderGap">Leading by {{ formatNumber(leaderGap, 2) }} points</span>
      <div class="flex items-end justify-center gap-4 max-w-4xl mx-auto">
        <div
          v-for="entry in podiumOrder"
          :key="entry.player.id"
          class="flex-1 flex flex-col items-center"
        >
          <!-- Player Info -->
          <div class="text-center mb-4 space-y-2">
            <div v-if="entry.rank <= 3" class="text-4xl font-bold mb-2" :class="entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-300' : 'text-orange-600'">
              {{ entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉' }}
            </div>
            <div v-else class="text-2xl font-bold mb-2 text-zinc-400">
              4th
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
            :class="getRankColor(entry.rank)"
            :style="{ height: `${getPodiumHeight(entry.totalPoints)}px` }"
          >
            <div class="text-3xl font-bold">{{ entry.rank }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Position Performance Graph -->
    <PodiumGraph v-if="tournament && tournament.races.length > 1" :tournament="tournament"/>

    <div v-if="stats" class="space-y-4">
      <div class="text-xs text-muted">
        {{ stats.totalRaces }} total races / {{ stats.uniqueTracks }} unique tracks
      </div>
      <StatsCards
        :items="[
          {
            label: 'Most played track',
            value: stats.mostPlayedTrack?.track ?? '-',
            helper: stats.mostPlayedTrack ? `${stats.mostPlayedTrack.count} races` : undefined,
            description: 'Track that has been raced the most across the tournament',
          },
          {
            label: 'Top win rate',
            value: topWinRate?.player.name ?? '-',
            helper: topWinRate ? `${topWinRate.wins} wins in ${topWinRate.total} races` : undefined,
            description: 'Player with the highest win rate among all races',
          },
          {
            label: 'Longest streak',
            value: longestStreak?.longest ?? 0,
            helper: longestStreak?.player.name ?? '-',
            description: 'Longest consecutive win streak by a single player',
          },
          {
            label: 'Most consistent',
            value: stats.mostConsistent?.player.name ?? '-',
            helper: stats.mostConsistent ? `${stats.mostConsistent.gap} position gap` : undefined,
            description: 'Player with the smallest gap between their best and worst finishing positions',
          },
          {
            label: 'Podium king',
            value: stats.podiumKing?.player.name ?? '-',
            helper: stats.podiumKing ? `${formatNumber(stats.podiumKing.percentage, 1)}% podiums` : undefined,
            description: 'Player with the highest percentage of podium finishes (top 3 positions)',
          },
          {
            label: 'Average points per race',
            value: stats.avgPointsPerRace?.player.name ?? '-',
            helper: stats.avgPointsPerRace ? `${formatNumber(stats.avgPointsPerRace.avgPoints, 1)} pts/race` : undefined,
            description: 'Player with the highest average points scored per race',
          },
          {
            label: 'First loser',
            value: stats.firstLoser?.player.name ?? '-',
            helper: stats.firstLoser ? `${stats.firstLoser.secondPlaces} second places` : undefined,
            description: 'Player with the most 2nd place finishes',
          },
          {
            label: 'Blue Shell Warrior',
            value: stats.mostBlueShellBonuses?.player.name ?? '-',
            helper: stats.mostBlueShellBonuses ? `${stats.mostBlueShellBonuses.bonuses} bonus${stats.mostBlueShellBonuses.bonuses !== 1 ? 'es' : ''}` : '0 bonuses',
            description: 'Player who earned the most blue shell bonuses (hit by blue shell but still won)',
          },
        ]"
      />
    </div>
  </section>

  <section v-else class="card p-6 text-sm text-muted">
    Tournament not found. Choose one from the sidebar.
  </section>
</template>
