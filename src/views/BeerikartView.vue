<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Trophy } from 'lucide-vue-next'

interface BracketPlayer {
  id: string
  name: string
}

interface BracketRace {
  id: string
  round: string
  slot: number
  players: string[]
  placements: string[] // Ordered by finish position
  completed: boolean
}

const players = ref<BracketPlayer[]>([])
const races = ref<BracketRace[]>([])
const playerNames = ref<string[]>(Array(16).fill(''))
const currentRound = ref<string | null>(null)
const editingRaceId = ref<string | null>(null)
const editingPlacements = ref<string[]>([])
const refreshKey = ref(0)


const roundOrder = [
  'Winner bracket 1',
  'Winner bracket 2',
  'Loser bracket 1',
  'Winner bracket finale',
  'Loser bracket 2',
  'Qual finale',
  'Consolation',
  'Grand finale',
]

const winnerRounds = ['Winner bracket 1', 'Winner bracket 2', 'Winner bracket finale', 'Grand finale']
const loserRounds = ['Loser bracket 1', 'Loser bracket 2', 'Qual finale', 'Consolation']

// Computed properties for reactive bracket display
const bracketOverview = computed(() => {
  // Force recompute by accessing refreshKey
  const _ = refreshKey.value
  const result: Record<string, Array<BracketRace | null>> = {}
  
  for (const round of [...winnerRounds, ...loserRounds]) {
    // Inline logic to ensure Vue tracks dependencies
    const existingRaces = races.value
      .filter(r => r.round === round)
      .sort((a, b) => a.slot - b.slot)
    
    const expectedCount = getExpectedRaceCount(round)
    const roundRaces: Array<BracketRace | null> = []
    
    for (let slot = 0; slot < expectedCount; slot++) {
      const race = existingRaces.find(r => r.slot === slot)
      roundRaces.push(race || null)
    }
    
    result[round] = roundRaces
  }
  
  return result
})

const fillTestNames = () => {
  const testNames = [
    'Mario', 'Luigi', 'Peach', 'Bowser',
    'Yoshi', 'Toad', 'Donkey Kong', 'Wario',
    'Waluigi', 'Rosalina', 'Daisy', 'Koopa',
    'Shy Guy', 'Birdo', 'Boo', 'Dry Bones'
  ]
  playerNames.value = [...testNames]
}

const collectPlayers = () => {
  players.value = playerNames.value
    .filter(name => name.trim())
    .map((name, index) => ({
      id: `p${Date.now()}_${index}`,
      name: name.trim(),
    }))
}

const startTournament = () => {
  collectPlayers()
  
  if (players.value.length < 4) {
    alert('Du trenger minst 4 spillere')
    return
  }
  
  // Initialize bracket structure
  races.value = []
  currentRound.value = 'Winner bracket 1'
  
  // Create initial races for Winner bracket 1
  const shuffled = [...players.value].sort(() => Math.random() - 0.5)
  let slot = 0
  for (let i = 0; i < shuffled.length; i += 4) {
    const racePlayers = shuffled.slice(i, i + 4)
    if (racePlayers.length >= 3) {
      races.value.push({
        id: `race${Date.now()}_${i}`,
        round: 'Winner bracket 1',
        slot,
        players: racePlayers.map(p => p.id),
        placements: [],
        completed: false,
      })
      slot += 1
    }
  }

  advanceBracket()
}

const getRoundRacesSorted = (round: string) => {
  return races.value
    .filter(r => r.round === round)
    .sort((a, b) => a.slot - b.slot)
}

const ensureRace = (round: string, slot: number, playerIds: Array<string | null>) => {
  const uniquePlayers = playerIds.filter((id, index, list): id is string => {
    return Boolean(id) && list.indexOf(id) === index
  })
  if (uniquePlayers.length < 3) return
  const existing = races.value.find(r => r.round === round && r.slot === slot)
  if (existing) {
    if (!existing.completed) {
      existing.players = uniquePlayers
    }
    return
  }
  races.value.push({
    id: `race_${round}_${slot}_${Date.now()}`,
    round,
    slot,
    players: uniquePlayers,
    placements: [],
    completed: false,
  })
}

const getPlacement = (race: BracketRace | undefined, index: number) => {
  if (!race || !race.completed) return null
  return race.placements[index] ?? null
}

const ensureConsolation = (playersToAdd: Array<string | null>, slot: number) => {
  const playersFiltered = playersToAdd.filter((id): id is string => Boolean(id))
  if (playersFiltered.length >= 3) {
    ensureRace('Consolation', slot, playersFiltered)
  }
}

const updateCurrentRound = () => {
  const next = roundOrder.find((round) => {
    const roundRaces = getRoundRacesSorted(round)
    return roundRaces.length > 0 && roundRaces.some(r => !r.completed)
  })
  if (next) {
    currentRound.value = next
  }
}

const advanceBracket = () => {
  const w1 = getRoundRacesSorted('Winner bracket 1')
  if (w1.length >= 4 && w1.every(r => r.completed)) {
    const [a, b, c, d] = w1

    const w2_1 = [getPlacement(a, 0), getPlacement(b, 1), getPlacement(c, 0), getPlacement(d, 1)]
    const w2_2 = [getPlacement(b, 0), getPlacement(a, 1), getPlacement(d, 0), getPlacement(c, 1)]
    ensureRace('Winner bracket 2', 0, w2_1)
    ensureRace('Winner bracket 2', 1, w2_2)

    const l1_1 = [getPlacement(a, 2), getPlacement(b, 3), getPlacement(c, 2), getPlacement(d, 3)]
    const l1_2 = [getPlacement(b, 2), getPlacement(a, 3), getPlacement(d, 2), getPlacement(c, 3)]
    ensureRace('Loser bracket 1', 0, l1_1)
    ensureRace('Loser bracket 1', 1, l1_2)
  }

  const w2 = getRoundRacesSorted('Winner bracket 2')
  if (w2.length >= 2 && w2.every(r => r.completed)) {
    const w2_1 = w2[0]
    const w2_2 = w2[1]

    const wbfPlayers = [
      getPlacement(w2_1, 0),
      getPlacement(w2_2, 1),
      getPlacement(w2_2, 0),
      getPlacement(w2_1, 1),
    ]
    ensureRace('Winner bracket finale', 0, wbfPlayers)

    const lb2FromWb2 = [
      getPlacement(w2_1, 2),
      getPlacement(w2_2, 3),
      getPlacement(w2_2, 2),
      getPlacement(w2_1, 3),
    ]

    const l1 = getRoundRacesSorted('Loser bracket 1')
    if (l1.length >= 2 && l1.every(r => r.completed)) {
      const l1_1 = l1[0]
      const l1_2 = l1[1]

      const lb2FromL1 = [
        getPlacement(l1_1, 0),
        getPlacement(l1_2, 1),
        getPlacement(l1_2, 0),
        getPlacement(l1_1, 1),
      ]

      const l2_1 = [lb2FromWb2[0], lb2FromL1[1], lb2FromWb2[2], lb2FromL1[3]]
      const l2_2 = [lb2FromWb2[1], lb2FromL1[0], lb2FromWb2[3], lb2FromL1[2]]
      ensureRace('Loser bracket 2', 0, l2_1)
      ensureRace('Loser bracket 2', 1, l2_2)

      const elimL1 = [getPlacement(l1_1, 2), getPlacement(l1_1, 3), getPlacement(l1_2, 2), getPlacement(l1_2, 3)]
      ensureConsolation(elimL1, 0)
    }
  }

  const l2 = getRoundRacesSorted('Loser bracket 2')
  if (l2.length >= 2 && l2.every(r => r.completed)) {
    const l2_1 = l2[0]
    const l2_2 = l2[1]

    const qualPlayers = [
      getPlacement(l2_1, 0),
      getPlacement(l2_2, 1),
      getPlacement(l2_2, 0),
      getPlacement(l2_1, 1),
    ]
    ensureRace('Qual finale', 0, qualPlayers)

    const elimL2 = [getPlacement(l2_1, 2), getPlacement(l2_1, 3), getPlacement(l2_2, 2), getPlacement(l2_2, 3)]
    ensureConsolation(elimL2, 1)
  }

  const wbf = getRoundRacesSorted('Winner bracket finale')[0]
  const qual = getRoundRacesSorted('Qual finale')[0]
  if (wbf?.completed && qual?.completed) {
    const grandPlayers = [getPlacement(wbf, 0), getPlacement(wbf, 1), getPlacement(qual, 0), getPlacement(qual, 1)]
    ensureRace('Grand finale', 0, grandPlayers)
  }

  updateCurrentRound()
}

// Get potential players for a slot based on completed races (even if race doesn't exist yet)
const getPotentialPlayers = (round: string, slot: number): Array<string | null> => {
  const w1 = getRoundRacesSorted('Winner bracket 1')
  const w2 = getRoundRacesSorted('Winner bracket 2')
  const l1 = getRoundRacesSorted('Loser bracket 1')
  const l2 = getRoundRacesSorted('Loser bracket 2')
  const wbf = getRoundRacesSorted('Winner bracket finale')[0]
  const qual = getRoundRacesSorted('Qual finale')[0]
  
  // Winner bracket 2
  if (round === 'Winner bracket 2') {
    if (w1.length >= 4) {
      const [a, b, c, d] = w1
      if (slot === 0) {
        return [getPlacement(a, 0), getPlacement(b, 1), getPlacement(c, 0), getPlacement(d, 1)]
      } else if (slot === 1) {
        return [getPlacement(b, 0), getPlacement(a, 1), getPlacement(d, 0), getPlacement(c, 1)]
      }
    }
  }
  
  // Loser bracket 1
  if (round === 'Loser bracket 1') {
    if (w1.length >= 4) {
      const [a, b, c, d] = w1
      if (slot === 0) {
        return [getPlacement(a, 2), getPlacement(b, 3), getPlacement(c, 2), getPlacement(d, 3)]
      } else if (slot === 1) {
        return [getPlacement(b, 2), getPlacement(a, 3), getPlacement(d, 2), getPlacement(c, 3)]
      }
    }
  }
  
  // Winner bracket finale
  if (round === 'Winner bracket finale' && w2.length >= 2) {
    const w2_1 = w2[0]
    const w2_2 = w2[1]
    if (slot === 0) {
      return [getPlacement(w2_1, 0), getPlacement(w2_2, 1), getPlacement(w2_2, 0), getPlacement(w2_1, 1)]
    }
  }
  
  // Loser bracket 2
  if (round === 'Loser bracket 2' && w2.length >= 2) {
    const w2_1 = w2[0]
    const w2_2 = w2[1]
    const lb2FromWb2 = [
      getPlacement(w2_1, 2),
      getPlacement(w2_2, 3),
      getPlacement(w2_2, 2),
      getPlacement(w2_1, 3),
    ]
    if (l1.length >= 2) {
      const l1_1 = l1[0]
      const l1_2 = l1[1]
      const lb2FromL1 = [
        getPlacement(l1_1, 0),
        getPlacement(l1_2, 1),
        getPlacement(l1_2, 0),
        getPlacement(l1_1, 1),
      ]
      if (slot === 0) {
        return [lb2FromWb2[0], lb2FromL1[1], lb2FromWb2[2], lb2FromL1[3]]
      } else if (slot === 1) {
        return [lb2FromWb2[1], lb2FromL1[0], lb2FromWb2[3], lb2FromL1[2]]
      }
    }
  }
  
  // Qual finale
  if (round === 'Qual finale' && l2.length >= 2) {
    const l2_1 = l2[0]
    const l2_2 = l2[1]
    if (slot === 0) {
      return [getPlacement(l2_1, 0), getPlacement(l2_2, 1), getPlacement(l2_2, 0), getPlacement(l2_1, 1)]
    }
  }
  
  // Consolation
  if (round === 'Consolation') {
    if (w1.length >= 4) {
      const [a, b, c, d] = w1
      const elimW1 = [getPlacement(a, 3), getPlacement(b, 2), getPlacement(c, 3), getPlacement(d, 2)]
      if (slot === 0) {
        return elimW1.filter(p => p !== null)
      }
    }
    if (l2.length >= 2) {
      const l2_1 = l2[0]
      const l2_2 = l2[1]
      const elimL2 = [getPlacement(l2_1, 2), getPlacement(l2_1, 3), getPlacement(l2_2, 2), getPlacement(l2_2, 3)]
      if (slot === 1) {
        return elimL2.filter(p => p !== null)
      }
    }
  }
  
  // Grand finale
  if (round === 'Grand finale' && wbf && qual) {
    if (slot === 0) {
      return [getPlacement(wbf, 0), getPlacement(wbf, 1), getPlacement(qual, 0), getPlacement(qual, 1)]
    }
  }
  
  return []
}

const getRaceRows = (race: BracketRace | null, round?: string, slot?: number) => {
  if (!race) {
    // Check if we have potential players from completed races
    if (round !== undefined && slot !== undefined) {
      const potentialPlayers = getPotentialPlayers(round, slot)
      if (potentialPlayers.length > 0) {
        // Show potential players with their names
        return potentialPlayers.map((playerId, index) => ({
          id: `potential_${round}_${slot}_${index}`,
          name: playerId ? (getPlayerById(playerId)?.name ?? 'TBD') : 'TBD',
          placement: index + 1,
        }))
      }
    }
    
    // Return 4 empty slots for placeholder
    return Array(4).fill(null).map((_, index) => ({
      id: `placeholder_${index}`,
      name: 'TBD',
      placement: index + 1,
    }))
  }
  
  const ordered = race.completed && race.placements.length ? race.placements : race.players
  return ordered.map((playerId, index) => ({
    id: `${race.id}_${playerId}_${index}`,
    name: getPlayerById(playerId)?.name ?? '-',
    placement: index + 1,
  }))
}

const getExpectedRaceCount = (round: string): number => {
  const playerCount = players.value.length
  
  switch (round) {
    case 'Winner bracket 1':
      return Math.ceil(playerCount / 4)
    case 'Winner bracket 2':
      return 2
    case 'Winner bracket finale':
      return 1
    case 'Loser bracket 1':
      return 2
    case 'Loser bracket 2':
      return 2
    case 'Qual finale':
      return 1
    case 'Consolation':
      return 2
    case 'Grand finale':
      return 1
    default:
      return 0
  }
}

const getRacesWithPlaceholders = (round: string): Array<BracketRace | null> => {
  const existingRaces = getRoundRacesSorted(round)
  const expectedCount = getExpectedRaceCount(round)
  const result: Array<BracketRace | null> = []
  
  for (let slot = 0; slot < expectedCount; slot++) {
    const race = existingRaces.find(r => r.slot === slot)
    result.push(race || null)
  }
  
  return result
}

const getRacesForRound = (round: string) => {
  return getRoundRacesSorted(round)
}

const activeRaces = computed(() => {
  return currentRound.value ? getRacesForRound(currentRound.value) : []
})

const getPlayerById = (id: string) => {
  return players.value.find(p => p.id === id)
}

const startEditingRace = (raceId: string) => {
  const race = races.value.find(r => r.id === raceId)
  if (!race) return
  
  editingRaceId.value = raceId
  editingPlacements.value = race.completed ? [...race.placements] : [...race.players]
}

const cancelEditingRace = () => {
  editingRaceId.value = null
  editingPlacements.value = []
}

const saveRaceResult = async () => {
  if (!editingRaceId.value) return
  
  const raceIndex = races.value.findIndex(r => r.id === editingRaceId.value)
  if (raceIndex === -1) return
  
  // Create a new array to ensure reactivity
  const newRaces = [...races.value]
  newRaces[raceIndex] = {
    ...newRaces[raceIndex],
    placements: [...editingPlacements.value],
    completed: true
  }
  races.value = newRaces
  
  editingRaceId.value = null
  editingPlacements.value = []

  // Force update
  refreshKey.value++
  
  // Wait for DOM to update
  await nextTick()
  
  // Then check for bracket advancement
  advanceBracket()
  
  // Force another update for new races
  refreshKey.value++
}

const movePlayerUp = (index: number) => {
  if (index === 0) return
  const temp = editingPlacements.value[index - 1]
  editingPlacements.value[index - 1] = editingPlacements.value[index]
  editingPlacements.value[index] = temp
}

const movePlayerDown = (index: number) => {
  if (index === editingPlacements.value.length - 1) return
  const temp = editingPlacements.value[index + 1]
  editingPlacements.value[index + 1] = editingPlacements.value[index]
  editingPlacements.value[index] = temp
}
</script>

<template>
  <div class="content-area">
    <div class="mb-6">
      <h1 class="text-3xl font-semibold mb-2">🍺 Beeriokart</h1>
      <p class="subtle">Double elimination bracket turnering - alle får minst 3 races, maks 5</p>
    </div>

    <!-- Player Setup -->
    <div v-if="!currentRound" class="space-y-6">
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title">Legg til spillere (maks 16)</h2>
          <button @click="fillTestNames" class="btn btn-ghost text-xs">
            🎮 Fyll test-navn
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div
            v-for="(name, index) in playerNames"
            :key="index"
            class="flex items-center gap-2"
          >
            <div
              class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold bg-zinc-200 text-zinc-700"
            >
              {{ index + 1 }}
            </div>
            <input
              v-model="playerNames[index]"
              type="text"
              :placeholder="`Spiller ${index + 1}`"
              class="input flex-1"
            />
          </div>
        </div>

        <button
          @click="startTournament"
          class="btn btn-primary w-full"
        >
          <Trophy :size="20" />
          Start turnering
        </button>
        <p class="text-sm text-muted mt-4 text-center">
          Legg til minst 4 spillere for å starte
        </p>
      </div>
    </div>

    <!-- Tournament Bracket -->
    <div v-else class="space-y-6">
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title">{{ currentRound }}</h2>
          <div class="text-sm text-muted">
            {{ players.length }} spillere aktive
          </div>
        </div>

        <!-- Races for current round -->
        <div class="space-y-4">
          <div
            v-for="race in activeRaces"
            :key="race.id"
            class="p-4 rounded-xl border bg-white/50"
          >
            <div class="font-semibold mb-3">Race {{ activeRaces.indexOf(race) + 1 }}</div>
            
            <!-- Editing mode -->
            <div v-if="editingRaceId === race.id" class="space-y-3">
              <div class="text-sm text-muted mb-2">Dra for å endre plassering (topp = 1. plass)</div>
              <div class="space-y-2">
                <div
                  v-for="(playerId, index) in editingPlacements"
                  :key="playerId"
                  class="flex items-center gap-2 p-2 rounded-lg border border-black/10 bg-white/60"
                >
                  <div class="flex flex-col gap-1">
                    <button
                      @click="movePlayerUp(index)"
                      class="text-xs text-muted hover:text-primary"
                      :disabled="index === 0"
                      :class="{ 'opacity-30': index === 0 }"
                    >
                      ▲
                    </button>
                    <button
                      @click="movePlayerDown(index)"
                      class="text-xs text-muted hover:text-primary"
                      :disabled="index === editingPlacements.length - 1"
                      :class="{ 'opacity-30': index === editingPlacements.length - 1 }"
                    >
                      ▼
                    </button>
                  </div>
                  <div class="font-bold text-lg w-8 text-center">
                    {{ index + 1 }}.
                  </div>
                  <span class="font-semibold">{{ getPlayerById(playerId)?.name }}</span>
                </div>
              </div>
              <div class="flex gap-2 mt-4">
                <button @click="saveRaceResult" class="btn btn-primary flex-1">
                  Lagre resultat
                </button>
                <button @click="cancelEditingRace" class="btn btn-ghost">
                  Avbryt
                </button>
              </div>
            </div>

            <!-- View mode -->
            <div v-else>
              <div v-if="race.completed" class="space-y-2">
                <div
                  v-for="(playerId, index) in race.placements"
                  :key="playerId"
                  class="flex items-center gap-3 p-2 rounded-lg border border-black/10 bg-white/60"
                >
                  <div class="font-bold text-lg w-8">
                    {{ index + 1 }}.
                  </div>
                  <span class="font-semibold">{{ getPlayerById(playerId)?.name }}</span>
                </div>
                <button @click="startEditingRace(race.id)" class="btn btn-ghost w-full mt-2 text-sm">
                  Endre resultat
                </button>
              </div>
              <div v-else>
                <div class="space-y-2 mb-3">
                  <div
                    v-for="(playerId, index) in race.players"
                    :key="playerId"
                    class="flex items-center gap-3 p-2 rounded-lg border border-black/10 bg-white/60"
                  >
                    <span class="font-semibold">{{ getPlayerById(playerId)?.name }}</span>
                  </div>
                </div>
                <button @click="startEditingRace(race.id)" class="btn btn-primary w-full">
                  Registrer resultat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bracket overview -->
      <div class="card p-6 space-y-6" :key="`bracket-${refreshKey}`">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="section-title">Bracket oversikt</h2>
        </div>

        <div class="space-y-4">
          <div class="flex flex-wrap gap-3">
            <div
              v-for="round in winnerRounds"
              :key="round"
              class="flex-1 min-w-[240px] rounded-lg border border-black/10 p-3 bg-white/40"
            >
              <h3 class="text-sm font-semibold text-muted mb-3">{{ round }}</h3>
              <div class="space-y-2">
                <div
                  v-for="(race, raceIndex) in bracketOverview[round]"
                  :key="race?.id || `placeholder_${round}_${raceIndex}`"
                  class="rounded-lg border p-2.5"
                  :class="race ? (race.completed ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300') : 'bg-slate-50/60 border-dashed'"
                >
                  <div class="text-[10px] uppercase mb-1.5 flex items-center justify-between font-semibold"
                    :class="race ? (race.completed ? 'text-green-700' : 'text-amber-700') : 'text-slate-400'">
                    <span>Race {{ raceIndex + 1 }}</span>
                    <span v-if="race?.completed" class="text-green-600 text-sm">✓</span>
                    <span v-else-if="race" class="text-amber-600 text-sm">⏱</span>
                  </div>
                  <div class="space-y-1">
                    <div
                      v-for="row in getRaceRows(race, round, raceIndex)"
                      :key="row.id"
                      class="flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold border"
                      :class="race?.completed
                        ? 'border-green-200 bg-white text-ink' 
                        : race
                        ? 'border-amber-200 bg-white text-ink'
                        : 'border-dashed border-slate-300 bg-transparent text-slate-400'"
                    >
                      <span class="w-4 text-[10px] font-semibold text-muted">
                        {{ row.placement }}.
                      </span>
                      <span class="truncate">{{ row.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <div
              v-for="round in loserRounds"
              :key="round"
              class="flex-1 min-w-[240px] rounded-lg border border-black/10 p-3 bg-white/40"
            >
              <h3 class="text-sm font-semibold text-muted mb-3">{{ round }}</h3>
              <div class="space-y-2">
                <div
                  v-for="(race, raceIndex) in bracketOverview[round]"
                  :key="race?.id || `placeholder_${round}_${raceIndex}`"
                  class="rounded-lg border p-2.5"
                  :class="race ? (race.completed ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300') : 'bg-slate-50/60 border-dashed'"
                >
                  <div class="text-[10px] uppercase mb-1.5 flex items-center justify-between font-semibold"
                    :class="race ? (race.completed ? 'text-green-700' : 'text-amber-700') : 'text-slate-400'">
                    <span>Race {{ raceIndex + 1 }}</span>
                    <span v-if="race?.completed" class="text-green-600 text-sm">✓</span>
                    <span v-else-if="race" class="text-amber-600 text-sm">⏱</span>
                  </div>
                  <div class="space-y-1">
                    <div
                      v-for="row in getRaceRows(race, round, raceIndex)"
                      :key="row.id"
                      class="flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold border"
                      :class="race?.completed
                        ? 'border-green-200 bg-white text-ink' 
                        : race
                        ? 'border-amber-200 bg-white text-ink'
                        : 'border-dashed border-slate-300 bg-transparent text-slate-400'"
                    >
                      <span class="w-4 text-[10px] font-semibold text-muted">
                        {{ row.placement }}.
                      </span>
                      <span class="truncate">{{ row.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
