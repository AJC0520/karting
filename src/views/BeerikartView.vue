<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Trophy } from 'lucide-vue-next'
import BracketLegend from '@/components/BracketLegend.vue'
import BracketPodium from '@/components/BracketPodium.vue'
import BracketRaceCard from '@/components/BracketRaceCard.vue'

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
  'Loser bracket 1',
  'Winner bracket 2',
  'Loser bracket 2',
  'Winner bracket finale',
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

const grandFinaleResult = computed(() => {
  const grandFinaleRaces = bracketOverview.value['Grand finale']
  if (grandFinaleRaces && grandFinaleRaces.length > 0) {
    const race = grandFinaleRaces[0]
    if (race && race.completed && race.placements) {
      return race.placements.map((playerId, index) => ({
        placement: index + 1,
        player: getPlayerById(playerId)
      }))
    }
  }
  return null
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
    alert('You need at least 4 players')
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
    }
  }

  // Consolation: Create as soon as Loser bracket 1 is done
  const l1 = getRoundRacesSorted('Loser bracket 1')
  if (l1.length >= 2 && l1.every(r => r.completed)) {
    const l1_1 = l1[0]
    const l1_2 = l1[1]
    const elimL1 = [getPlacement(l1_1, 2), getPlacement(l1_1, 3), getPlacement(l1_2, 2), getPlacement(l1_2, 3)]
    ensureConsolation(elimL1, 0)
  }

  // Qual finale: 2 losers from winner bracket finale + 2 winners from loser bracket 2
  const wbf = getRoundRacesSorted('Winner bracket finale')[0]
  const l2 = getRoundRacesSorted('Loser bracket 2')
  if (wbf?.completed && l2.length >= 2 && l2.every(r => r.completed)) {
    const l2_1 = l2[0]
    const l2_2 = l2[1]

    const qualPlayers = [
      getPlacement(wbf, 2),      // 3rd place from winner bracket finale
      getPlacement(wbf, 3),      // 4th place from winner bracket finale
      getPlacement(l2_1, 0),     // Winner from loser bracket 2 race 1
      getPlacement(l2_2, 0),     // Winner from loser bracket 2 race 2
    ]
    ensureRace('Qual finale', 0, qualPlayers)
  }

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
  if (round === 'Qual finale') {
    if (wbf && l2.length >= 2) {
      const l2_1 = l2[0]
      const l2_2 = l2[1]
      if (slot === 0) {
        return [
          getPlacement(wbf, 2),    // 3rd place from winner bracket finale
          getPlacement(wbf, 3),    // 4th place from winner bracket finale
          getPlacement(l2_1, 0),   // Winner from loser bracket 2 race 1
          getPlacement(l2_2, 0),   // Winner from loser bracket 2 race 2
        ]
      }
    }
  }
  
  // Consolation
  if (round === 'Consolation' && l1.length >= 2) {
    const l1_1 = l1[0]
    const l1_2 = l1[1]
    if (slot === 0) {
      return [
        getPlacement(l1_1, 2),   // 3rd from loser bracket 1 race 1
        getPlacement(l1_1, 3),   // 4th from loser bracket 1 race 1
        getPlacement(l1_2, 2),   // 3rd from loser bracket 1 race 2
        getPlacement(l1_2, 3),   // 4th from loser bracket 1 race 2
      ]
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

const getPositionColor = (round: string, position: number): string => {
  // Grand finale: Gold, Silver, Bronze, White
  if (round === 'Grand finale') {
    if (position === 1) return 'bg-yellow-400 text-yellow-950 border-yellow-500'
    if (position === 2) return 'bg-gray-300 text-gray-900 border-gray-400'
    if (position === 3) return 'bg-orange-400 text-orange-950 border-orange-500'
    return 'bg-white text-ink border-gray-300'
  }
  
  // Loser bracket 1: Top 2 advance (yellow - not safe yet), bottom 2 go to consolation (red)
  if (round === 'Loser bracket 1') {
    return position <= 2 ? 'bg-yellow-100 text-yellow-900 border-yellow-300' : 'bg-red-100 text-red-900 border-red-300'
  }
  
  // Loser bracket 2: Only 1st advances (yellow - not safe yet), rest eliminated (red)
  if (round === 'Loser bracket 2') {
    return position === 1 ? 'bg-yellow-100 text-yellow-900 border-yellow-300' : 'bg-red-100 text-red-900 border-red-300'
  }
  
  // Qual finale: Top 2 advance to grand finale (green), bottom 2 eliminated (red)
  if (round === 'Qual finale') {
    return position <= 2 ? 'bg-green-100 text-green-900 border-green-300' : 'bg-red-100 text-red-900 border-red-300'
  }
  
  // Winner bracket 1 & 2: Top 2 advance (green), 3rd-4th go to loser bracket (yellow)
  if (round === 'Winner bracket 1' || round === 'Winner bracket 2') {
    return position <= 2 ? 'bg-green-100 text-green-900 border-green-300' : 'bg-yellow-100 text-yellow-900 border-yellow-300'
  }
  
  // Winner bracket finale: Top 2 advance (green), 3rd-4th go to qual finale (yellow)
  if (round === 'Winner bracket finale') {
    return position <= 2 ? 'bg-green-100 text-green-900 border-green-300' : 'bg-yellow-100 text-yellow-900 border-yellow-300'
  }
  
  // Consolation: Determining 5-8th place among already eliminated players
  if (round === 'Consolation') {
    return 'bg-slate-100 text-slate-900 border-slate-300'
  }
  
  return 'bg-white text-ink border-gray-300'
}

const getPositionIndicator = (round: string, position: number): { type: 'icon' | 'text' | null, value: string } => {
  // Winner bracket 1 & 2: 1st-2nd advance to next winner round (arrow right), 3rd-4th go to loser bracket (arrow down)
  if (round === 'Winner bracket 1' || round === 'Winner bracket 2') {
    if (position <= 2) {
      return { type: 'icon', value: 'arrow-right' }
    } else {
      return { type: 'icon', value: 'arrow-down' }
    }
  }
  
  // Winner bracket finale: 1st-2nd go to grand finale (text), 3rd-4th go to qual finale (arrow down)
  if (round === 'Winner bracket finale') {
    if (position <= 2) {
      return { type: 'text', value: 'grand finale' }
    } else {
      return { type: 'icon', value: 'arrow-down' }
    }
  }
  
  // Loser bracket 1: 1st-2nd advance to loser bracket 2 (arrow right), 3rd-4th go to consolation (text)
  if (round === 'Loser bracket 1') {
    if (position <= 2) {
      return { type: 'icon', value: 'arrow-right' }
    } else {
      return { type: 'text', value: 'consolation' }
    }
  }
  
  // Loser bracket 2: 1st advances to qual finale (arrow right), 2nd-4th eliminated (X)
  if (round === 'Loser bracket 2') {
    if (position === 1) {
      return { type: 'icon', value: 'arrow-right' }
    } else {
      return { type: 'icon', value: 'x' }
    }
  }
  
  // Qual finale: 1st-2nd go to grand finale (text), 3rd-4th eliminated (X)
  if (round === 'Qual finale') {
    if (position <= 2) {
      return { type: 'text', value: 'grand finale' }
    } else {
      return { type: 'icon', value: 'x' }
    }
  }
  
  return { type: null, value: '' }
}

const shouldShowIndicator = (round: string, position: number): boolean => {
  const indicator = getPositionIndicator(round, position)
  const color = getPositionColor(round, position)
  
  // If it's the "grand finale" text, always show it
  if (indicator.type === 'text' && indicator.value === 'grand finale') {
    return true
  }
  
  // If the color is green or yellow, don't show other indicators
  if (color.includes('bg-green') || color.includes('bg-yellow')) {
    return false
  }
  
  // Otherwise, show the indicator
  return true
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
      return 1
    case 'Grand finale':
      return 1
    default:
      return 0
  }
}

const getRacesForRound = (round: string) => {
  return getRoundRacesSorted(round)
}
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
    </div>

    <!-- Player Setup -->
    <div v-if="!currentRound" class="space-y-6">
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title">Add players</h2>
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
          Start tournament
        </button>
        <p class="text-sm text-muted mt-4 text-center">
          Add a minimum of 4 players to start
        </p>
      </div>
    </div>

    <!-- Tournament Bracket -->
    <div v-else class="space-y-6">
      <!-- Bracket overview -->
      <div class="card p-6 space-y-6" :key="`bracket-${refreshKey}`">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="section-title">Tournament bracket</h2>
        </div>

        <!-- Legend -->
        <BracketLegend />

        <div class="space-y-4">
          <!-- Vertical bracket layout in tournament progression order -->
          <div class="space-y-6">
            <div
              v-for="round in roundOrder"
              :key="round"
              class="rounded-lg border border-black/10 p-4 bg-white/40"
            >
              <h3 class="text-base font-bold text-muted mb-4">{{ round }}</h3>
              
              <!-- Podium for completed Grand finale -->
              <BracketPodium v-if="round === 'Grand finale' && grandFinaleResult" :results="grandFinaleResult" />
              
              <div 
                v-else
                class="gap-3"
                :class="round === 'Winner bracket 1' ? 'grid grid-cols-2 max-w-[544px] mx-auto' : 'flex flex-wrap justify-center'"
              >
                <BracketRaceCard
                  v-for="(race, raceIndex) in bracketOverview[round]"
                  :key="race?.id || `placeholder_${round}_${raceIndex}`"
                  :race="race"
                  :race-index="raceIndex"
                  :round="round"
                  :is-editing="race?.id === editingRaceId"
                  :editing-placements="editingPlacements"
                  :get-player-by-id="getPlayerById"
                  :get-position-color="getPositionColor"
                  :get-position-indicator="getPositionIndicator"
                  :should-show-indicator="shouldShowIndicator"
                  :get-race-rows="getRaceRows"
                  @start-edit="startEditingRace(race!.id)"
                  @move-up="movePlayerUp"
                  @move-down="movePlayerDown"
                  @save="saveRaceResult"
                  @cancel="cancelEditingRace"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
