<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { Player, Race, RaceStatus, Tournament } from '@/types'
import { createId } from '@/utils/id'
import { fromDatetimeLocal, toDatetimeLocal } from '@/utils/format'
import { TRACKS } from '@/utils/defaults'

const props = defineProps<{
  tournament: Tournament
  race?: Race | null
  submitLabel?: string
}>()

const emit = defineEmits<{
  (event: 'save', race: Race): void
  (event: 'cancel'): void
}>()

const track = ref('')
const timestamp = ref('')
const notes = ref('')
const positionMap = ref<Record<string, number | null>>({})
const blueShells = ref<Set<string>>(new Set())

const activePlayers = computed(() => props.tournament.players)
const blueShellEnabled = computed(() => props.tournament.settings.blueShellBonus ?? false)

const validationError = computed(() => {
  if (!track.value.trim()) return 'Track name is required.'
  if (!TRACKS.includes(track.value.trim())) return 'Please select a valid track from the list.'
  const hasAnyPosition = activePlayers.value.some(p => {
    const pos = positionMap.value[p.id]
    return pos !== null && pos !== undefined && pos > 0
  })
  if (!hasAnyPosition) return 'Enter at least one player position.'
  const counts = new Map<number, number>()
  activePlayers.value.forEach((player) => {
    const pos = positionMap.value[player.id]
    if (pos !== null && pos !== undefined && pos > 0) {
      counts.set(pos, (counts.get(pos) ?? 0) + 1)
    }
  })
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([pos]) => pos)
    .sort((a, b) => a - b)
  if (duplicates.length > 0) {
    return `Each position must be unique. Duplicate positions: ${duplicates.join(', ')}.`
  }
  return ''
})

const canSubmit = computed(() => validationError.value.length === 0)

const resetState = () => {
  track.value = props.race?.track ?? ''
  timestamp.value = props.race ? toDatetimeLocal(props.race.timestamp) : toDatetimeLocal(new Date().toISOString())
  notes.value = props.race?.notes ?? ''
  
  // Initialize position map from race data
  positionMap.value = {}
  if (props.race?.rankByPlayer) {
    // Use actual positions from rankByPlayer
    Object.entries(props.race.rankByPlayer).forEach(([playerId, position]) => {
      positionMap.value[playerId] = position
    })
  } else if (props.race?.placements) {
    // Fallback to old behavior for races without rankByPlayer
    props.race.placements.forEach((playerId, index) => {
      positionMap.value[playerId] = index + 1
    })
  } else {
    activePlayers.value.forEach(player => {
      positionMap.value[player.id] = null
    })
  }
  
  // Initialize blue shells from race data
  blueShells.value = new Set(props.race?.blueShells ?? [])
}

watch(
  () => props.race,
  () => resetState(),
  { immediate: true },
)

watch(
  () => activePlayers.value.map((player) => player.id),
  () => resetState(),
)

const handlePositionInput = (playerId: string, value: string) => {
  const num = parseInt(value, 10)
  if (value === '' || isNaN(num)) {
    positionMap.value[playerId] = null
  } else {
    positionMap.value[playerId] = Math.max(1, Math.min(24, num))
  }
}

const toggleBlueShell = (playerId: string) => {
  if (blueShells.value.has(playerId)) {
    blueShells.value.delete(playerId)
  } else {
    blueShells.value.add(playerId)
  }
}

const saveRace = () => {
  if (!canSubmit.value) return
  const now = new Date().toISOString()

  // Build placements from position map
  const entries = activePlayers.value
    .filter(player => {
      const pos = positionMap.value[player.id]
      return pos !== null && pos !== undefined && pos > 0
    })
    .map(player => ({
      id: player.id,
      name: player.name,
      position: positionMap.value[player.id]!,
    }))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

  const placements = entries.map(entry => entry.id)

  // Build rankByPlayer to store actual positions for scoring
  const rankByPlayer: Record<string, number> = {}
  entries.forEach(entry => {
    rankByPlayer[entry.id] = entry.position
  })

  const payload: Race = {
    id: props.race?.id ?? createId(),
    tournamentId: props.tournament.id,
    timestamp: timestamp.value ? fromDatetimeLocal(timestamp.value) : now,
    track: track.value.trim(),
    placements,
    notes: notes.value.trim() || undefined,
    status: undefined,
    rankByPlayer,
    manualPoints: undefined,
    blueShells: blueShells.value.size > 0 ? Array.from(blueShells.value) : undefined,
  }

  emit('save', payload)
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="saveRace">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="md:col-span-2">
        <label class="text-sm font-semibold">Track name</label>
        <input v-model="track" class="input mt-2" placeholder="Select a track from the list..." list="tracks" />
        <datalist id="tracks">
          <option v-for="trackName in TRACKS" :key="trackName" :value="trackName" />
        </datalist>
      </div>
      <div>
        <label class="text-sm font-semibold">Date &amp; time</label>
        <input v-model="timestamp" class="input mt-2" type="datetime-local" />
      </div>
    </div>

    <div>
      <label class="text-sm font-semibold">Notes (optional)</label>
      <textarea v-model="notes" class="textarea mt-2" rows="3" placeholder="Anything memorable?" />
    </div>

    <div class="space-y-3">
      <p class="text-sm text-muted">Enter actual race position for each player (1-24). Players can finish outside podium if bots placed higher. Leave empty if they didn't race.</p>
      <div class="grid gap-3 md:grid-cols-2">
        <div v-for="player in activePlayers" :key="player.id" class="card flex items-center gap-3 px-4 py-3">
          <div class="flex-1">
            <p class="font-semibold">{{ player.name }}</p>
            <p v-if="player.nickname" class="text-xs text-muted">{{ player.nickname }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="blueShellEnabled && positionMap[player.id] === 1"
              type="button"
              @click="toggleBlueShell(player.id)"
              :class="[
                'w-8 h-8 rounded flex items-center justify-center transition-all',
                blueShells.has(player.id)
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-zinc-100 border border-zinc-300 hover:bg-zinc-200'
              ]"
              :title="blueShells.has(player.id) ? 'Blue shell bonus active' : 'Click if hit by blue shell but won'"
            >
              <img src="/blue_shell.png" alt="Blue Shell" class="w-5 h-5" />
            </button>
            <input
              :value="positionMap[player.id] ?? ''"
              class="input w-20 text-center"
              type="number"
              min="1"
              max="24"
              placeholder="—"
              @input="handlePositionInput(player.id, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="validationError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ validationError }}
    </div>

    <div class="flex flex-wrap gap-2">
      <button class="btn btn-primary" type="submit" :disabled="!canSubmit">
        {{ submitLabel ?? 'Save race' }}
      </button>
      <button class="btn btn-ghost" type="button" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
