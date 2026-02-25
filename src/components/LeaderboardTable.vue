<script setup lang="ts">
import type { LeaderboardEntry } from '@/utils/stats'
import { formatNumber } from '@/utils/format'

defineProps<{
  entries: LeaderboardEntry[]
}>()
</script>

<template>
  <div class="card overflow-hidden">
    <div class="grid grid-cols-12 gap-2 border-b border-black/5 bg-black/5 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
      <span class="col-span-1">Rank</span>
      <span class="col-span-3">Player</span>
      <span class="col-span-2">Total</span>
      <span class="col-span-2">Avg/Race</span>
      <span class="col-span-2">Last Race</span>
      <span class="col-span-2">Gap</span>
    </div>
    <div
      v-for="entry in entries"
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
</template>
