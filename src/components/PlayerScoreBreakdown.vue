<script setup lang="ts">
import type { ScoredRace } from '@/utils/bracketScoring'
import type { PlayerColor } from '@/utils/playerColors'

defineProps<{
  playerName: string
  playerColor: PlayerColor | undefined
  placement: number
  totalPoints: number
  races: ScoredRace[]
}>()

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

const positionSuffix = (position: number): string => {
  switch (position) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}
</script>

<template>
  <div class="mk-panel w-64 overflow-hidden shadow-lg">
    <div
      class="flex items-center gap-2 border-b-2 border-ink px-2.5 py-1.5"
      :style="{ backgroundColor: playerColor?.hex, color: playerColor?.contrast }"
    >
      <span class="min-w-0 flex-1 truncate font-mk text-xs uppercase tracking-wide">
        {{ playerName }}
      </span>
      <span class="font-mk text-[10px] opacity-80">{{ ordinal(placement) }}</span>
    </div>

    <div class="divide-y divide-ink/10 p-1.5">
      <div
        v-for="(race, index) in races"
        :key="`${race.round}_${index}`"
        class="flex items-center justify-between gap-2 px-1.5 py-1 text-xs"
      >
        <span class="truncate text-ink/80">{{ race.round }}</span>
        <span class="flex-shrink-0 tabular-nums text-ink/60">{{ race.position }}{{ positionSuffix(race.position) }}</span>
        <span class="flex-shrink-0 font-mk tabular-nums text-ink">+{{ Math.round(race.points) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-between border-t-2 border-ink px-2.5 py-1.5">
      <span class="font-mk text-[10px] uppercase tracking-wide text-ink/70">Total</span>
      <span class="font-mk text-sm tabular-nums text-ink">{{ Math.round(totalPoints) }} pts</span>
    </div>
  </div>
</template>
