<script setup lang="ts">
import { ref } from 'vue'
import { isJokerId, JOKER_COLOR, type PlayerColor } from '@/utils/playerColors'

interface BracketPlayer {
  id: string
  name: string
}

interface BracketRace {
  id: string
  round: string
  slot: number
  players: string[]
  placements: string[]
  completed: boolean
  joker_mimics?: Record<string, string> // Maps joker ID to player ID they're mimicking
}

interface RaceRow {
  id: string
  playerId: string | null
  name: string
  placement: number
}

const props = defineProps<{
  race: BracketRace | null
  raceIndex: number
  round: string
  isActive: boolean
  getPlayerById: (id: string) => BracketPlayer | undefined
  getPositionColor: (round: string, position: number) => string
  getRaceRows: (race: BracketRace | null, round: string, raceIndex: number) => RaceRow[]
  playerColors?: Record<string, PlayerColor>
  focusedPlayerId?: string | null
}>()

const emit = defineEmits<{
  startEdit: []
  focusPlayer: [playerId: string | null]
}>()

/** The position tile is filled with the driver's identity colour. */
const rankStyle = (playerId: string | null) => {
  const color = colorFor(playerId)
  if (!color) return { backgroundColor: '#E4E4E7', color: '#71717A' }
  return { backgroundColor: color.hex, color: color.contrast }
}

const colorFor = (playerId: string | null): PlayerColor | null => {
  if (!playerId) return null
  return props.playerColors?.[playerId] ?? (isJokerId(playerId) ? JOKER_COLOR : null)
}

/** Dim every row that does not belong to the currently traced player. */
const isDimmed = (playerId: string | null): boolean =>
  Boolean(props.focusedPlayerId) && props.focusedPlayerId !== playerId

const anchorFor = (playerId: string | null): string | undefined =>
  props.race && playerId ? `${props.race.id}|${playerId}` : undefined

// Helper to get the mimic message for a joker
const getMimicMessage = (playerId: string | null): string => {
  if (!playerId || !props.race?.joker_mimics || !isJokerId(playerId)) {
    return ''
  }

  const mimicTargetId = props.race.joker_mimics[playerId]
  if (mimicTargetId) {
    const mimicTarget = props.getPlayerById(mimicTargetId)
    return mimicTarget ? `mimics ${mimicTarget.name}` : ''
  }

  return ''
}

</script>

<template>
  <div
    data-race-card
    class="w-[248px] overflow-hidden rounded-lg border-2"
    :class="[
      race
        ? 'mk-panel-sm'
        : 'border-dashed border-ink/25 bg-white/40',
      race && !race.completed ? 'mk-card-live' : '',
      race ? 'cursor-pointer transition-transform hover:-translate-y-0.5' : '',
      isActive ? 'mk-card-active' : '',
    ]"
    @click="race && emit('startEdit')"
  >
    <div
      class="flex items-center justify-between gap-2 border-b-2 px-2 py-1"
      :class="race
        ? race.completed
          ? 'border-ink/20 bg-ink text-white'
          : 'border-ink/20 bg-amber-200 text-amber-950'
        : 'border-dashed border-ink/20 bg-transparent text-ink/40'"
    >
      <span class="font-mk text-[10px] uppercase tracking-wider">
        Race {{ raceIndex + 1 }}
      </span>
      <span v-if="race?.completed" class="mk-flag mk-flag-done">Done</span>
      <span v-else-if="race" class="mk-flag mk-flag-ready">Ready</span>
      <span v-else class="mk-flag mk-flag-tbd">Tbd</span>
    </div>

    <div>
      <div
        v-for="row in getRaceRows(race, round, raceIndex)"
        :key="row.id"
        :data-anchor="anchorFor(row.playerId)"
        class="mk-driver"
        :class="[
          race?.completed
            ? getPositionColor(round, row.placement)
            : race
            ? 'border-ink/10 bg-white text-ink'
            : 'border-ink/10 bg-transparent text-ink/35',
          isDimmed(row.playerId) ? 'opacity-25' : '',
          focusedPlayerId && focusedPlayerId === row.playerId ? 'ring-2 ring-inset' : '',
        ]"
        :style="focusedPlayerId === row.playerId
          ? { '--tw-ring-color': colorFor(row.playerId)?.hex }
          : undefined"
        @mouseenter="emit('focusPlayer', row.playerId)"
        @mouseleave="emit('focusPlayer', null)"
      >
        <!-- Position tile, filled with the driver's identity colour -->
        <span class="mk-rank" :style="rankStyle(row.playerId)">{{ row.placement }}</span>

        <div class="flex min-w-0 flex-1 flex-col">
          <span class="truncate font-bold uppercase tracking-wide">{{ row.name }}</span>
          <span
            v-if="getMimicMessage(row.playerId)"
            class="truncate text-[9px] font-normal italic text-purple-700"
          >
            {{ getMimicMessage(row.playerId) }}
          </span>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* The race that is up next gets a soft amber halo so it is findable at a
   glance in a bracket full of finished cards. */
.mk-card-live {
  box-shadow: 0 3px 0 rgba(18, 24, 40, 0.2), 0 0 0 4px rgba(251, 191, 36, 0.35);
}

/* The race currently open in the editor panel. Shadow only - a transform here
   would fight the hover translate and make the card twitch. */
.mk-card-active {
  box-shadow: 0 3px 0 rgba(18, 24, 40, 0.2), 0 0 0 4px rgba(37, 99, 235, 0.55);
}
</style>
