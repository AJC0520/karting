<script setup lang="ts">
import { Trophy } from 'lucide-vue-next'
import type { BracketStanding } from '@/utils/bracketScoring'
import type { PlayerColor } from '@/utils/playerColors'

defineProps<{
  standings: BracketStanding[]
  getPlayerName: (id: string) => string
  playerColors: Record<string, PlayerColor>
}>()

const RANK_BADGE = [
  'bg-yellow-400 text-yellow-950 border-yellow-500',
  'bg-gray-300 text-gray-900 border-gray-400',
  'bg-orange-400 text-orange-950 border-orange-500',
]

const ordinal = (n: number): string => {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1: return `${n}st`
    case 2: return `${n}nd`
    case 3: return `${n}rd`
    default: return `${n}th`
  }
}
</script>

<template>
  <div class="mk-panel overflow-hidden">
    <div class="mk-plate mk-plate-gold flex items-center gap-2">
      <Trophy :size="16" />
      <span>Full standings</span>
    </div>
    <div class="mk-checker h-3 border-b-2 border-ink"></div>

    <div class="divide-y-2 divide-ink/10 p-2.5">
      <div
        v-for="standing in standings"
        :key="standing.playerId"
        class="flex items-center gap-3 px-2 py-2"
      >
        <span
          class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink font-mk text-xs"
          :class="RANK_BADGE[standing.placement - 1] ?? 'bg-white text-ink'"
        >
          {{ standing.placement }}
        </span>

        <span
          class="h-3 w-3 flex-shrink-0 rounded-full border border-ink/40"
          :style="{ backgroundColor: playerColors[standing.playerId]?.hex }"
        ></span>

        <span class="min-w-0 flex-1 truncate font-medium text-ink">
          {{ getPlayerName(standing.playerId) }}
        </span>

        <span class="font-mk text-sm tabular-nums text-ink">
          {{ Math.round(standing.totalPoints) }} pts
        </span>
      </div>
    </div>
  </div>
</template>
