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

/**
 * Drag to reorder, with the rest of the list sliding out of the way to show
 * where the driver will land.
 *
 * The drop target is worked out from the pointer position against the row
 * coordinates captured at drag start, never from which element the event landed
 * on. The rows are being moved by transforms, so asking which one is under the
 * cursor would fight the animation driving them - this way it does not matter
 * whether dragover fires on a row or on the list itself.
 */
const listEl = ref<HTMLElement | null>(null)
const dragFrom = ref<number | null>(null)
const dragTo = ref<number | null>(null)

/** Row midpoints and row pitch, frozen at drag start. */
let slotCenters: number[] = []
let slotPitch = 0

const handleDragStart = (index: number, event: DragEvent) => {
  const rows = Array.from(listEl.value?.children ?? []) as HTMLElement[]
  const rects = rows.map(row => row.getBoundingClientRect())
  slotCenters = rects.map(r => r.top + r.height / 2)
  slotPitch = rects.length > 1 ? rects[1].top - rects[0].top : rects[0]?.height ?? 0

  dragFrom.value = index
  dragTo.value = index

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    // Firefox will not start a drag unless the transfer carries something.
    event.dataTransfer.setData('text/plain', String(index))
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (dragFrom.value === null) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'

  // Rows whose original midpoint is above the pointer decide the insert point.
  let insertion = 0
  for (const center of slotCenters) {
    if (event.clientY > center) insertion++
  }
  const target = insertion > dragFrom.value ? insertion - 1 : insertion
  dragTo.value = Math.max(0, Math.min(slotCenters.length - 1, target))
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const from = dragFrom.value
  const to = dragTo.value
  dragFrom.value = null
  dragTo.value = null
  if (from !== null && to !== null && from !== to) emit('reorder', from, to)
}

/** Fires after a drop, and on its own when the driver is released elsewhere. */
const handleDragEnd = () => {
  dragFrom.value = null
  dragTo.value = null
}

/** How far this row slides to open a gap for the dragged driver. */
const slotOffset = (index: number): number => {
  const from = dragFrom.value
  const to = dragTo.value
  if (from === null || to === null) return 0
  if (index === from) return (to - from) * slotPitch
  if (from < to && index > from && index <= to) return -slotPitch
  if (from > to && index < from && index >= to) return slotPitch
  return 0
}

const rowTransform = (index: number): string => {
  const shift = `translateY(${slotOffset(index)}px)`
  return index === dragFrom.value ? `${shift} scale(1.03)` : shift
}

/**
 * The finishing position this row would take if the drag ended now, so the
 * number tile and the outcome badge preview the result as you move.
 */
const previewPlacement = (index: number): number => {
  const from = dragFrom.value
  const to = dragTo.value
  if (from === null || to === null) return index + 1
  if (index === from) return to + 1
  if (from < to && index > from && index <= to) return index
  if (from > to && index < from && index >= to) return index + 2
  return index + 1
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

      <ul
        ref="listEl"
        class="space-y-2"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <li
          v-for="(playerId, index) in editingPlacements"
          :key="playerId"
          draggable="true"
          @dragstart="handleDragStart(index, $event)"
          @dragover="handleDragOver"
          @drop="handleDrop"
          @dragend="handleDragEnd"
          class="mk-drag-row flex cursor-grab select-none items-center gap-2 rounded-lg border-2 p-2"
          :class="[
            getPositionColor(round, previewPlacement(index)),
            index === dragFrom ? 'mk-drag-lifted cursor-grabbing' : '',
          ]"
          :style="{ transform: rowTransform(index) }"
        >
          <GripVertical :size="18" class="flex-shrink-0 text-ink/30" />

          <span
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 border-ink font-mk text-lg leading-none"
            :style="rankStyle(playerId)"
          >
            {{ previewPlacement(index) }}
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
            <span v-if="getOutcome(round, previewPlacement(index)).label" class="mt-1 self-start">
              <span
                class="mk-outcome"
                :class="OUTCOME_CLASS[getOutcome(round, previewPlacement(index)).tone as keyof typeof OUTCOME_CLASS]"
              >
                {{ getOutcome(round, previewPlacement(index)).label }}
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

<style scoped>
/* Rows glide to their new slot rather than snapping, so it stays obvious where
   the driver being dragged is going to land. */
.mk-drag-row {
  transition:
    transform 180ms cubic-bezier(0.2, 0, 0, 1),
    background-color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

/* The row under the cursor is lifted off the list. */
.mk-drag-lifted {
  box-shadow: 0 10px 22px rgba(18, 24, 40, 0.3);
  position: relative;
  z-index: 10;
}

@media (prefers-reduced-motion: reduce) {
  .mk-drag-row {
    transition: none;
  }
}
</style>
