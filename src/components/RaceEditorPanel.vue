<script setup lang="ts">
import { ref } from 'vue'
import { GripVertical, RefreshCw, ChevronUp, ChevronDown } from 'lucide-vue-next'
import { isJokerId, JOKER_COLOR, type PlayerColor } from '@/utils/playerColors'
import { OUTCOME_CLASS } from '@/utils/bracketDisplay'

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
  joker_mimics?: Record<string, string>
}

const props = defineProps<{
  race: BracketRace
  raceIndex: number
  round: string
  editingPlacements: string[]
  getPlayerById: (id: string) => BracketPlayer | undefined
  getPositionColor: (round: string, position: number) => string
  getOutcome: (round: string, position: number) => { label: string; tone: string }
  playerColors?: Record<string, PlayerColor>
  isWinnerRound: boolean
}>()

const emit = defineEmits<{
  moveUp: [index: number]
  moveDown: [index: number]
  reorder: [fromIndex: number, toIndex: number]
  save: []
  cancel: []
  swapPlayer: [raceId: string, playerIndex: number]
}>()

const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const handleDragStart = (index: number) => {
  draggedIndex.value = index
}

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault()
  dragOverIndex.value = index
}

const handleDragLeave = () => {
  dragOverIndex.value = null
}

const handleDrop = (event: DragEvent, toIndex: number) => {
  event.preventDefault()
  if (draggedIndex.value !== null && draggedIndex.value !== toIndex) {
    emit('reorder', draggedIndex.value, toIndex)
  }
  draggedIndex.value = null
  dragOverIndex.value = null
}

const handleDragEnd = () => {
  draggedIndex.value = null
  dragOverIndex.value = null
}

const colorFor = (playerId: string): PlayerColor =>
  props.playerColors?.[playerId] ?? JOKER_COLOR

const rankStyle = (playerId: string) => {
  const color = colorFor(playerId)
  return { backgroundColor: color.hex, color: color.contrast }
}

const getMimicMessage = (playerId: string): string => {
  if (!props.race.joker_mimics || !isJokerId(playerId)) return ''
  const target = props.race.joker_mimics[playerId]
  if (!target) return ''
  const name = props.getPlayerById(target)?.name
  return name ? `mimics ${name}` : ''
}
</script>

<template>
  <div class="mk-panel overflow-hidden">
    <div
      class="mk-plate flex items-center justify-between gap-2"
      :class="round === 'Grand finale'
        ? 'mk-plate-gold'
        : isWinnerRound
        ? 'mk-plate-green'
        : 'mk-plate-red'"
    >
      <span class="truncate">{{ round }}</span>
      <span
        class="flex-shrink-0 rounded border-2 border-ink bg-white px-1.5 py-0.5 text-[10px] text-ink"
        style="text-shadow: none"
      >
        Race {{ raceIndex + 1 }}
      </span>
    </div>
    <div v-if="round === 'Grand finale'" class="mk-checker h-3 border-b-[3px] border-ink"></div>

    <div class="p-4">
      <p class="mb-3 text-xs font-semibold text-muted">
        Drag drivers into finishing order, or use the arrows.
      </p>

      <ul class="space-y-2">
        <li
          v-for="(playerId, index) in editingPlacements"
          :key="playerId"
          draggable="true"
          @dragstart="handleDragStart(index)"
          @dragover="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, index)"
          @dragend="handleDragEnd"
          class="flex cursor-move items-center gap-2 rounded-lg border-2 p-2 transition-all"
          :class="[
            getPositionColor(round, index + 1),
            draggedIndex === index ? 'opacity-40' : '',
            dragOverIndex === index && draggedIndex !== index
              ? 'ring-2 ring-inset ring-blue-500'
              : '',
          ]"
        >
          <GripVertical :size="18" class="flex-shrink-0 text-ink/30" />

          <span
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 border-ink font-mk text-lg leading-none"
            :style="rankStyle(playerId)"
          >
            {{ index + 1 }}
          </span>

          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-bold uppercase tracking-wide">
              {{ getPlayerById(playerId)?.name }}
            </span>
            <span
              v-if="getMimicMessage(playerId)"
              class="truncate text-[10px] font-normal italic text-purple-700"
            >
              {{ getMimicMessage(playerId) }}
            </span>
            <span v-if="getOutcome(round, index + 1).label" class="mt-1 self-start">
              <span
                class="mk-outcome"
                :class="OUTCOME_CLASS[getOutcome(round, index + 1).tone as keyof typeof OUTCOME_CLASS]"
              >
                {{ getOutcome(round, index + 1).label }}
              </span>
            </span>
          </div>

          <div class="flex flex-shrink-0 flex-col gap-0.5">
            <button
              @click="emit('moveUp', index)"
              :disabled="index === 0"
              class="rounded border-2 border-ink/20 bg-white/70 p-0.5 transition hover:bg-white disabled:opacity-25"
              title="Move up"
            >
              <ChevronUp :size="14" />
            </button>
            <button
              @click="emit('moveDown', index)"
              :disabled="index === editingPlacements.length - 1"
              class="rounded border-2 border-ink/20 bg-white/70 p-0.5 transition hover:bg-white disabled:opacity-25"
              title="Move down"
            >
              <ChevronDown :size="14" />
            </button>
          </div>

          <button
            v-if="!race.completed"
            @click.stop="emit('swapPlayer', race.id, race.players.indexOf(playerId))"
            class="flex-shrink-0 rounded border-2 border-ink/20 bg-white/70 p-1 transition hover:bg-white"
            title="Swap driver"
          >
            <RefreshCw :size="14" />
          </button>
        </li>
      </ul>

      <div class="mt-4 flex gap-2">
        <button @click="emit('save')" class="btn btn-primary flex-1">Save result</button>
        <button @click="emit('cancel')" class="btn btn-ghost">Cancel</button>
      </div>
    </div>
  </div>
</template>
