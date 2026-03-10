<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, ArrowDown, X, RefreshCw, GripVertical } from 'lucide-vue-next'

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
  openSwapModal?: (raceId: string, playerIndex: number) => void
}>()

const emit = defineEmits<{
  startEdit: []
  moveUp: [index: number]
  moveDown: [index: number]
  reorder: [fromIndex: number, toIndex: number]
  save: []
  cancel: []
  swapPlayer: [raceId: string, playerIndex: number]
}>()

// Drag and drop state
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

// Helper to check if a player is a joker
const isJoker = (playerId: string): boolean => {
  return playerId?.startsWith('joker_') ?? false
}

// Helper to get the mimic message for a joker
const getMimicMessage = (playerId: string): string => {
  if (!props.race?.joker_mimics || !isJoker(playerId)) {
    return ''
  }
  
  const mimicTargetId = props.race.joker_mimics[playerId]
  if (mimicTargetId) {
    const mimicTarget = props.getPlayerById(mimicTargetId)
    return mimicTarget ? ` mimics ${mimicTarget.name}` : ''
  }
  
  return ''
}</script>

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
      <div class="text-[9px] text-muted mb-2">Drag to reorder or use arrows</div>
      <div
        v-for="(playerId, index) in editingPlacements"
        :key="playerId"
        draggable="true"
        @dragstart="handleDragStart(index)"
        @dragover="handleDragOver($event, index)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, index)"
        @dragend="handleDragEnd"
        class="flex items-center gap-1.5 p-1.5 rounded border cursor-move transition-all"
        :class="[
          getPositionColor(round, index + 1),
          draggedIndex === index ? 'opacity-50 scale-95' : '',
          dragOverIndex === index && draggedIndex !== index ? 'border-blue-500 border-2' : ''
        ]"
      >
        <GripVertical :size="14" class="text-gray-400 flex-shrink-0" />
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
        <div class="flex-1 truncate flex flex-col">
          <span class="text-xs font-semibold">{{ getPlayerById(playerId)?.name }}</span>
          <span 
            v-if="getMimicMessage(playerId)" 
            class="text-[9px] text-purple-600 italic font-normal"
          >
            {{ getMimicMessage(playerId) }}
          </span>
        </div>
        <ArrowRight v-if="shouldShowIndicator(round, index + 1) && getPositionIndicator(round, index + 1).type === 'icon' && getPositionIndicator(round, index + 1).value === 'arrow-right'" :size="12" class="flex-shrink-0" />
        <ArrowDown v-if="shouldShowIndicator(round, index + 1) && getPositionIndicator(round, index + 1).type === 'icon' && getPositionIndicator(round, index + 1).value === 'arrow-down'" :size="12" class="flex-shrink-0" />
        <X v-if="shouldShowIndicator(round, index + 1) && getPositionIndicator(round, index + 1).type === 'icon' && getPositionIndicator(round, index + 1).value === 'x'" :size="12" class="flex-shrink-0" />
        <span v-if="shouldShowIndicator(round, index + 1) && getPositionIndicator(round, index + 1).type === 'text'" class="text-[8px] opacity-70 flex-shrink-0">{{ getPositionIndicator(round, index + 1).value }}</span>
      </div>
      <div class="flex gap-1.5 mt-2">
        <button @click="emit('save')" class="btn btn-primary text-xs py-1 px-2 flex-1">
          Save
        </button>
        <button @click="emit('cancel')" class="btn btn-ghost text-xs py-1 px-2">
          Cancel
        </button>
      </div>
    </div>

    <!-- View mode -->
    <div v-else class="space-y-1">
      <div
        v-for="(row, rowIndex) in getRaceRows(race, round, raceIndex)"
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
        <div class="truncate flex-1 flex flex-col">
          <span>{{ row.name }}</span>
          <span 
            v-if="race && getMimicMessage(race.players[rowIndex])" 
            class="text-[9px] text-purple-600 italic font-normal"
          >
            {{ getMimicMessage(race.players[rowIndex]) }}
          </span>
        </div>
        
        <!-- Swap button (only for incomplete races and real players) -->
        <button
          v-if="race && !race.completed && openSwapModal && row.name !== 'TBD'"
          @click.stop="emit('swapPlayer', race.id, rowIndex)"
          class="p-0.5 hover:bg-black/10 rounded transition-color"
          title="Swap player"
        >
          <RefreshCw :size="12" />
        </button>
        
        <ArrowRight v-if="race?.completed && shouldShowIndicator(round, row.placement) && getPositionIndicator(round, row.placement).type === 'icon' && getPositionIndicator(round, row.placement).value === 'arrow-right'" :size="12" class="flex-shrink-0" />
        <ArrowDown v-if="race?.completed && shouldShowIndicator(round, row.placement) && getPositionIndicator(round, row.placement).type === 'icon' && getPositionIndicator(round, row.placement).value === 'arrow-down'" :size="12" class="flex-shrink-0" />
        <X v-if="race?.completed && shouldShowIndicator(round, row.placement) && getPositionIndicator(round, row.placement).type === 'icon' && getPositionIndicator(round, row.placement).value === 'x'" :size="12" class="flex-shrink-0" />
        <span v-if="race?.completed && shouldShowIndicator(round, row.placement) && getPositionIndicator(round, row.placement).type === 'text'" class="text-[8px] opacity-70 flex-shrink-0">{{ getPositionIndicator(round, row.placement).value }}</span>
      </div>
    </div>
  </div>
</template>
