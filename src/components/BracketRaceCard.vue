<script setup lang="ts">
import { ArrowRight, ArrowDown, X } from 'lucide-vue-next'

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
}

interface RaceRow {
  id: string
  name: string
  placement: number
}

const props = defineProps<{
  race: BracketRace | null
  raceIndex: number
  round: string
  isEditing: boolean
  editingPlacements: string[]
  getPlayerById: (id: string) => BracketPlayer | undefined
  getPositionColor: (round: string, position: number) => string
  getPositionIndicator: (round: string, position: number) => { type: 'icon' | 'text' | null; value: string }
  shouldShowIndicator: (round: string, position: number) => boolean
  getRaceRows: (race: BracketRace | null, round: string, raceIndex: number) => RaceRow[]
}>()

const emit = defineEmits<{
  startEdit: []
  moveUp: [index: number]
  moveDown: [index: number]
  save: []
  cancel: []
}>()
</script>

<template>
  <div
    class="w-[260px] rounded-lg border p-2.5"
    :class="[
      race ? (race.completed ? 'bg-green-200 border-green-400' : 'bg-amber-50 border-amber-300') : 'bg-slate-50/60 border-dashed',
      race ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
    ]"
    @click="race && emit('startEdit')"
  >
    <div class="text-[10px] uppercase mb-1.5 flex items-center justify-between font-semibold"
      :class="race ? (race.completed ? 'text-green-700' : 'text-amber-700') : 'text-slate-400'">
      <span>Race {{ raceIndex + 1 }}</span>
      <span v-if="race?.completed" class="text-green-600 text-sm">✓</span>
      <span v-else-if="race" class="text-amber-600 text-sm">⏱</span>
    </div>

    <!-- Editing mode -->
    <div v-if="race && isEditing" class="space-y-2" @click.stop>
      <div class="text-[9px] text-muted mb-2">Use arrows to swap position</div>
      <div
        v-for="(playerId, index) in editingPlacements"
        :key="playerId"
        class="flex items-center gap-1.5 p-1.5 rounded border"
        :class="getPositionColor(round, index + 1)"
      >
        <div class="flex flex-col gap-0.5">
          <button
            @click="emit('moveUp', index)"
            class="text-[9px] hover:opacity-70"
            :disabled="index === 0"
            :class="{ 'opacity-30': index === 0 }"
          >
            ▲
          </button>
          <button
            @click="emit('moveDown', index)"
            class="text-[9px] hover:opacity-70"
            :disabled="index === editingPlacements.length - 1"
            :class="{ 'opacity-30': index === editingPlacements.length - 1 }"
          >
            ▼
          </button>
        </div>
        <div class="font-bold text-xs w-5 text-center">
          {{ index + 1 }}.
        </div>
        <span class="text-xs font-semibold truncate flex-1">{{ getPlayerById(playerId)?.name }}</span>
        <ArrowRight v-if="shouldShowIndicator(round, index + 1) && getPositionIndicator(round, index + 1).type === 'icon' && getPositionIndicator(round, index + 1).value === 'arrow-right'" :size="12" class="flex-shrink-0" />
        <ArrowDown v-if="shouldShowIndicator(round, index + 1) && getPositionIndicator(round, index + 1).type === 'icon' && getPositionIndicator(round, index + 1).value === 'arrow-down'" :size="12" class="flex-shrink-0" />
        <X v-if="shouldShowIndicator(round, index + 1) && getPositionIndicator(round, index + 1).type === 'icon' && getPositionIndicator(round, index + 1).value === 'x'" :size="12" class="flex-shrink-0" />
        <span v-if="shouldShowIndicator(round, index + 1) && getPositionIndicator(round, index + 1).type === 'text'" class="text-[8px] opacity-70 flex-shrink-0">{{ getPositionIndicator(round, index + 1).value }}</span>
      </div>
      <div class="flex gap-1.5 mt-2">
        <button @click="emit('save')" class="btn btn-primary text-xs py-1 px-2 flex-1">
          Lagre
        </button>
        <button @click="emit('cancel')" class="btn btn-ghost text-xs py-1 px-2">
          Avbryt
        </button>
      </div>
    </div>

    <!-- View mode -->
    <div v-else class="space-y-1">
      <div
        v-for="row in getRaceRows(race, round, raceIndex)"
        :key="row.id"
        class="flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold border"
        :class="race?.completed
          ? getPositionColor(round, row.placement)
          : race
          ? 'border-amber-200 bg-white text-ink'
          : 'border-dashed border-slate-300 bg-transparent text-slate-400'"
      >
        <span class="w-4 text-[10px] font-semibold">
          {{ row.placement }}.
        </span>
        <span class="truncate flex-1">{{ row.name }}</span>
        <ArrowRight v-if="race?.completed && shouldShowIndicator(round, row.placement) && getPositionIndicator(round, row.placement).type === 'icon' && getPositionIndicator(round, row.placement).value === 'arrow-right'" :size="12" class="flex-shrink-0" />
        <ArrowDown v-if="race?.completed && shouldShowIndicator(round, row.placement) && getPositionIndicator(round, row.placement).type === 'icon' && getPositionIndicator(round, row.placement).value === 'arrow-down'" :size="12" class="flex-shrink-0" />
        <X v-if="race?.completed && shouldShowIndicator(round, row.placement) && getPositionIndicator(round, row.placement).type === 'icon' && getPositionIndicator(round, row.placement).value === 'x'" :size="12" class="flex-shrink-0" />
        <span v-if="race?.completed && shouldShowIndicator(round, row.placement) && getPositionIndicator(round, row.placement).type === 'text'" class="text-[8px] opacity-70 flex-shrink-0">{{ getPositionIndicator(round, row.placement).value }}</span>
      </div>
    </div>
  </div>
</template>
