<script setup lang="ts">
import { computed } from 'vue'
import type { LeaderboardEntry } from '@/utils/stats'
import { formatNumber } from '@/utils/format'

const props = defineProps<{
  entries: LeaderboardEntry[]
}>()

const topThree = computed(() => props.entries.slice(0, 3))
const rest = computed(() => props.entries.slice(3))

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
</script>

<template>
  <div class="space-y-6">
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

    <!-- Rest of Leaderboard -->
    <div v-if="rest.length > 0" class="card overflow-hidden">
      <div class="grid grid-cols-12 gap-2 border-b border-black/5 bg-black/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
        <span class="col-span-1">Rank</span>
        <span class="col-span-3">Player</span>
        <span class="col-span-2">Total</span>
        <span class="col-span-2">Avg/Race</span>
        <span class="col-span-2">Last Race</span>
        <span class="col-span-2">Gap</span>
      </div>
      <div
        v-for="entry in rest"
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

    <!-- Empty State -->
    <div v-if="entries.length === 0" class="card p-6 text-center text-muted">
      No players in this tournament yet
    </div>
  </div>
</template>
