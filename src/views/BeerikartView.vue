<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { Trophy, Plus, List, Calendar, CheckCircle2, Trash2, Map, LoaderPinwheel, HelpCircle } from 'lucide-vue-next'
import { useBracketStore, type BracketPlayer, type BracketRaceLocal } from '@/stores/bracketStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import BracketLegend from '@/components/BracketLegend.vue'
import BracketPodium from '@/components/BracketPodium.vue'
import BracketRaceCard from '@/components/BracketRaceCard.vue'
import BracketFlow from '@/components/BracketFlow.vue'
import RaceEditorPanel from '@/components/RaceEditorPanel.vue'
import MapWheelSpinner from '@/components/MapWheelSpinner.vue'
import { buildPlayerColors } from '@/utils/playerColors'
import {
  getPositionColor,
  getOutcome,
  isElimination,
} from '@/utils/bracketDisplay'

const bracketStore = useBracketStore()
const authStore = useAuthStore()

interface BracketRace {
  id: string
  round: string
  slot: number
  players: string[]
  placements: string[] // Ordered by finish position
  completed: boolean
  joker_mimics?: Record<string, string> // Maps joker ID to player ID they're mimicking
}

const players = ref<BracketPlayer[]>([])
const races = ref<BracketRace[]>([])
const playerNames = ref<string[]>(Array(16).fill(''))
const tournamentName = ref('')
const currentRound = ref<string | null>(null)
const editingRaceId = ref<string | null>(null)
const editingPlacements = ref<string[]>([])
const refreshKey = ref(0)
const showTournamentList = ref(true)
const showNewTournamentForm = ref(false)
const jokerCount = ref(0)

// Player swap state
const swapModalOpen = ref(false)
const swapRaceId = ref<string | null>(null)
const swapPlayerIndex = ref<number | null>(null)

// Map wheel spinner state
const showMapSpinner = ref(false)
const selectedMap = ref<string | null>(null)

// Bracket presentation state
const showRules = ref(false)
const focusedPlayerId = ref<string | null>(null)

const playerColors = computed(() => buildPlayerColors(players.value))

/** The race currently open in the side editor, if any. */
const editingRace = computed(() =>
  editingRaceId.value ? races.value.find(r => r.id === editingRaceId.value) ?? null : null,
)

/**
 * Colours for the setup form, keyed by input slot rather than by player id -
 * lets a host see the grid fill with each driver's racing colour as they type.
 */
const setupColors = computed(() => {
  const filled = playerNames.value.map((name, index) => ({ id: `slot${index}`, name }))
  const colors = buildPlayerColors(filled)
  return filled.map(slot => colors[slot.id])
})

const setHoveredPlayer = (playerId: string | null) => {
  focusedPlayerId.value = playerId
}

const handleMapSelected = (track: string) => {
  selectedMap.value = track
  // You can do something with the selected track here, like display it
}

// Helper to check if a player is a joker
const isJoker = (playerId: string | null): boolean => {
  return playerId?.startsWith('joker_') ?? false
}

// Helper to create a joker player
const createJoker = (): BracketPlayer => {
  const joker: BracketPlayer = {
    id: `joker_${Date.now()}_${jokerCount.value++}`,
    name: '🃏 Joker'
  }
  players.value.push(joker)
  return joker
}

// Helper to assign joker mimics for a race
const assignJokerMimics = (racePlayerIds: string[]): Record<string, string> => {
  const jokerMimics: Record<string, string> = {}
  const jokers = racePlayerIds.filter(id => isJoker(id))
  const nonJokers = racePlayerIds.filter(id => !isJoker(id))
  
  // For each joker, randomly assign a non-joker player to mimic
  for (const jokerId of jokers) {
    if (nonJokers.length > 0) {
      const randomIndex = Math.floor(Math.random() * nonJokers.length)
      jokerMimics[jokerId] = nonJokers[randomIndex]
    }
  }
  
  return jokerMimics
}

// Load tournaments on mount
onMounted(async () => {
  if (authStore.isAuthenticated) {
    await bracketStore.fetchTournaments()
  }
})


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

const showNewTournamentCreation = () => {
  showTournamentList.value = false
  showNewTournamentForm.value = true
  currentRound.value = null
  races.value = []
  players.value = []
  playerNames.value = Array(16).fill('')
  tournamentName.value = ''
  jokerCount.value = 0
}

const cancelNewTournament = () => {
  showTournamentList.value = true
  showNewTournamentForm.value = false
}

const startTournament = async () => {
  collectPlayers()
  
  if (players.value.length < 12) {
    alert('You need at least 12 players')
    return
  }
  
  if (!tournamentName.value.trim()) {
    alert('Please enter a tournament name')
    return
  }
  
  // Create tournament in database
  const tournament = await bracketStore.createTournament(tournamentName.value.trim(), players.value)
  if (!tournament) {
    alert('Failed to create tournament')
    return
  }
  
  // Initialize bracket structure
  races.value = []
  currentRound.value = 'Winner bracket 1'
  showNewTournamentForm.value = false
  
  // Create initial races for Winner bracket 1 with optimal distribution
  const shuffled = [...players.value].sort(() => Math.random() - 0.5)
  
  // Calculate optimal distribution (3-4 players per race)
  const playerCount = shuffled.length
  const numRaces = Math.ceil(playerCount / 4)
  const baseSize = Math.floor(playerCount / numRaces)
  const remainder = playerCount % numRaces
  
  let playerIndex = 0
  for (let slot = 0; slot < numRaces; slot++) {
    // First 'remainder' races get one extra player
    const raceSize = slot < remainder ? baseSize + 1 : baseSize
    const racePlayers = shuffled.slice(playerIndex, playerIndex + raceSize)
    
    if (racePlayers.length >= 3) {
      const racePlayerIds = racePlayers.map(p => p.id)
      
      // Add jokers to fill up to 4 players
      while (racePlayerIds.length < 4) {
        const joker = createJoker()
        racePlayerIds.push(joker.id)
      }
      
      // Assign joker mimics
      const jokerMimics = assignJokerMimics(racePlayerIds)
      
      const race: BracketRace = {
        id: `race${Date.now()}_${slot}`,
        round: 'Winner bracket 1',
        slot,
        players: racePlayerIds,
        placements: [],
        completed: false,
        joker_mimics: jokerMimics,
      }
      races.value.push(race)
      
      // Save race to database
      await bracketStore.saveRace(race as BracketRaceLocal)
    }
    
    playerIndex += raceSize
  }
  
  // Update tournament with jokers included
  if (jokerCount.value > 0) {
    await supabase
      .from('bracket_tournaments')
      .update({ players: players.value as unknown as Json })
      .eq('id', tournament.id)
  }

  advanceBracket()
}

const loadTournament = async (tournamentId: string) => {
  const result = await bracketStore.loadTournament(tournamentId)
  if (!result) {
    alert('Failed to load tournament')
    return
  }
  
  // Load tournament data
  const { tournament, races: loadedRaces } = result
  players.value = tournament.players as BracketPlayer[]
  races.value = loadedRaces as BracketRace[]
  currentRound.value = tournament.current_round
  showTournamentList.value = false
  
  // Reset joker count based on loaded jokers
  jokerCount.value = players.value.filter(p => isJoker(p.id)).length
  
  refreshKey.value++
}

const backToTournamentList = () => {
  showTournamentList.value = true
  showNewTournamentForm.value = false
  currentRound.value = null
  bracketStore.clearCurrent()
}

const getRoundRacesSorted = (round: string) => {
  return races.value
    .filter(r => r.round === round)
    .sort((a, b) => a.slot - b.slot)
}

const ensureRace = async (round: string, slot: number, playerIds: Array<string | null>) => {
  // Filter out nulls and duplicates - keep jokers as they advance like real players
  const uniquePlayers = playerIds.filter((id, index, list): id is string => {
    return Boolean(id) && list.indexOf(id) === index
  })
  if (uniquePlayers.length < 3) return
  
  // Add NEW jokers to fill up to 4 players (only if we're under 4)
  const playersWithJokers = [...uniquePlayers]
  while (playersWithJokers.length < 4) {
    const joker = createJoker()
    playersWithJokers.push(joker.id)
  }
  
  // Assign joker mimics
  const jokerMimics = assignJokerMimics(playersWithJokers)
  
  const existing = races.value.find(r => r.round === round && r.slot === slot)
  if (existing) {
    if (!existing.completed) {
      existing.players = playersWithJokers
      existing.joker_mimics = jokerMimics
    }
    return
  }
  const newRace: BracketRace = {
    id: `race_${round}_${slot}_${Date.now()}`,
    round,
    slot,
    players: playersWithJokers,
    placements: [],
    completed: false,
    joker_mimics: jokerMimics,
  }
  races.value.push(newRace)
  
  // Save to database
  await bracketStore.saveRace(newRace as BracketRaceLocal)
}

const getPlacement = (race: BracketRace | undefined, index: number) => {
  if (!race || !race.completed) return null
  return race.placements[index] ?? null
}

const ensureConsolation = async (playersToAdd: Array<string | null>, slot: number) => {
  const playersFiltered = playersToAdd.filter((id): id is string => Boolean(id) && !isJoker(id))
  if (playersFiltered.length >= 3) {
    await ensureRace('Consolation', slot, playersFiltered)
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

const advanceBracket = async () => {
  const w1 = getRoundRacesSorted('Winner bracket 1')
  
  // Check if ALL Winner bracket 1 races are complete (not hardcoded to 4)
  if (w1.length > 0 && w1.every(r => r.completed)) {
    // Collect top 2 (for Winner bracket 2) and 3rd-4th (for Loser bracket 1)
    const w2Players: string[] = []
    const l1Players: string[] = []
    
    for (const race of w1) {
      const p1 = getPlacement(race, 0)
      const p2 = getPlacement(race, 1)
      const p3 = getPlacement(race, 2)
      const p4 = getPlacement(race, 3)
      
      if (p1) w2Players.push(p1)
      if (p2) w2Players.push(p2)
      if (p3) l1Players.push(p3)
      if (p4) l1Players.push(p4)
    }
    
    // Distribute W2 players across 2 races (alternating to mix)
    const w2_1: Array<string | null> = []
    const w2_2: Array<string | null> = []
    for (let i = 0; i < w2Players.length; i++) {
      if (i % 2 === 0) {
        w2_1.push(w2Players[i])
      } else {
        w2_2.push(w2Players[i])
      }
    }
    
    if (w2_1.length > 0) await ensureRace('Winner bracket 2', 0, w2_1)
    if (w2_2.length > 0) await ensureRace('Winner bracket 2', 1, w2_2)
    
    // Distribute L1 players across 2 races (alternating to mix)
    const l1_1: Array<string | null> = []
    const l1_2: Array<string | null> = []
    for (let i = 0; i < l1Players.length; i++) {
      if (i % 2 === 0) {
        l1_1.push(l1Players[i])
      } else {
        l1_2.push(l1Players[i])
      }
    }
    
    if (l1_1.length > 0) await ensureRace('Loser bracket 1', 0, l1_1)
    if (l1_2.length > 0) await ensureRace('Loser bracket 1', 1, l1_2)
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
    await ensureRace('Winner bracket finale', 0, wbfPlayers)

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
      await ensureRace('Loser bracket 2', 0, l2_1)
      await ensureRace('Loser bracket 2', 1, l2_2)
    }
  }

  // Consolation: Create as soon as Loser bracket 1 is done
  const l1 = getRoundRacesSorted('Loser bracket 1')
  if (l1.length >= 1 && l1.every(r => r.completed)) {
    const elimPlayers: Array<string | null> = []
    
    // Collect 3rd and 4th place from all Loser bracket 1 races
    for (const race of l1) {
      elimPlayers.push(getPlacement(race, 2)) // 3rd place
      elimPlayers.push(getPlacement(race, 3)) // 4th place
    }
    
    // If we don't have enough eliminated players (need at least 3), 
    // fill with 2nd place finishers from Loser bracket 1
    const validElimPlayers = elimPlayers.filter(p => p !== null)
    if (validElimPlayers.length < 3 && validElimPlayers.length > 0) {
      for (const race of l1) {
        if (validElimPlayers.length >= 4) break
        const secondPlace = getPlacement(race, 1)
        if (secondPlace && !elimPlayers.includes(secondPlace)) {
          elimPlayers.push(secondPlace)
        }
      }
    }
    
    await ensureConsolation(elimPlayers, 0)
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
    await ensureRace('Qual finale', 0, qualPlayers)
  }

  const qual = getRoundRacesSorted('Qual finale')[0]
  if (wbf?.completed && qual?.completed) {
    const grandPlayers = [getPlacement(wbf, 0), getPlacement(wbf, 1), getPlacement(qual, 0), getPlacement(qual, 1)]
    await ensureRace('Grand finale', 0, grandPlayers)
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
          playerId: playerId ?? null,
          name: playerId ? (getPlayerById(playerId)?.name ?? 'TBD') : 'TBD',
          placement: index + 1,
        }))
      }
    }

    // Return 4 empty slots for placeholder
    return Array(4).fill(null).map((_, index) => ({
      id: `placeholder_${index}`,
      playerId: null,
      name: 'TBD',
      placement: index + 1,
    }))
  }

  const ordered = race.completed && race.placements.length ? race.placements : race.players
  return ordered.map((playerId, index) => ({
    id: `${race.id}_${playerId}_${index}`,
    playerId,
    name: getPlayerById(playerId)?.name ?? '-',
    placement: index + 1,
  }))
}


const getExpectedRaceCount = (round: string): number => {
  switch (round) {
    case 'Winner bracket 1':
      // Return actual count of W1 races (created at start, never changes)
      return getRoundRacesSorted('Winner bracket 1').length || 0
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
  // editingPlacements is left as-is: the editor panel is still mounted while
  // its leave transition plays, and emptying it would blank the rows mid-slide.
  editingRaceId.value = null
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
  
  // Save to database
  await bracketStore.saveRace(newRaces[raceIndex] as BracketRaceLocal)
  
  editingRaceId.value = null

  // Force update
  refreshKey.value++
  
  // Wait for DOM to update
  await nextTick()
  
  // Then check for bracket advancement
  await advanceBracket()
  
  // Update current round in database
  if (currentRound.value) {
    await bracketStore.updateTournamentRound(currentRound.value)
  }
  
  // Check if tournament is complete (Grand finale is done)
  const grandFinale = races.value.find(r => r.round === 'Grand finale')
  if (grandFinale?.completed) {
    await bracketStore.completeTournament()
  }
  
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

const reorderPlayers = (fromIndex: number, toIndex: number) => {
  const newPlacements = [...editingPlacements.value]
  const [movedPlayer] = newPlacements.splice(fromIndex, 1)
  newPlacements.splice(toIndex, 0, movedPlayer)
  editingPlacements.value = newPlacements
}

const openSwapModal = (raceId: string, playerIndex: number) => {
  swapRaceId.value = raceId
  swapPlayerIndex.value = playerIndex
  swapModalOpen.value = true
}

const closeSwapModal = () => {
  swapModalOpen.value = false
  swapRaceId.value = null
  swapPlayerIndex.value = null
}

const swapPlayer = async (newPlayerId: string) => {
  if (!swapRaceId.value || swapPlayerIndex.value === null) return
  
  const race = races.value.find(r => r.id === swapRaceId.value)
  if (!race || race.completed) return
  
  // Get the old player ID being swapped out
  const oldPlayerId = race.players[swapPlayerIndex.value]
  
  // Find if the new player is currently in another race
  const otherRace = races.value.find(r => 
    r.id !== race.id && 
    !r.completed && 
    r.players.includes(newPlayerId)
  )
  
  // Update the first race
  const updatedPlayers = [...race.players]
  updatedPlayers[swapPlayerIndex.value] = newPlayerId
  race.players = updatedPlayers
  
  // Update joker mimics in the first race
  if (race.joker_mimics && oldPlayerId) {
    const updatedMimics = { ...race.joker_mimics }
    
    // Find any joker that was mimicking the old player
    for (const [jokerId, mimicTargetId] of Object.entries(updatedMimics)) {
      if (mimicTargetId === oldPlayerId) {
        // Reassign this joker to mimic a different non-joker player
        const availableTargets = race.players.filter(p => p !== jokerId && !isJoker(p))
        if (availableTargets.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableTargets.length)
          updatedMimics[jokerId] = availableTargets[randomIndex]
        }
      }
    }
    
    race.joker_mimics = updatedMimics
  }
  
  // If the new player was in another race, perform a true swap
  if (otherRace && oldPlayerId) {
    const otherPlayerIndex = otherRace.players.indexOf(newPlayerId)
    if (otherPlayerIndex !== -1) {
      // Swap: put the old player in the other race
      const otherUpdatedPlayers = [...otherRace.players]
      otherUpdatedPlayers[otherPlayerIndex] = oldPlayerId
      otherRace.players = otherUpdatedPlayers
      
      // Update joker mimics in the other race
      if (otherRace.joker_mimics && newPlayerId) {
        const otherUpdatedMimics = { ...otherRace.joker_mimics }
        
        // Find any joker that was mimicking the new player
        for (const [jokerId, mimicTargetId] of Object.entries(otherUpdatedMimics)) {
          if (mimicTargetId === newPlayerId) {
            // Reassign this joker to mimic a different non-joker player
            const availableTargets = otherRace.players.filter(p => p !== jokerId && !isJoker(p))
            if (availableTargets.length > 0) {
              const randomIndex = Math.floor(Math.random() * availableTargets.length)
              otherUpdatedMimics[jokerId] = availableTargets[randomIndex]
            }
          }
        }
        
        otherRace.joker_mimics = otherUpdatedMimics
      }
      
      // Save the other race to database
      await bracketStore.saveRace(otherRace as BracketRaceLocal)
    }
  }
  
  // Save the first race to database
  await bracketStore.saveRace(race as BracketRaceLocal)
  
  // Refresh display
  refreshKey.value++
  closeSwapModal()
}

const availablePlayersForSwap = computed(() => {
  if (!swapRaceId.value) return []
  
  const race = races.value.find(r => r.id === swapRaceId.value)
  if (!race) return []
  
  // Show all non-joker players except those already in this specific race
  // (players from other races can now be swapped)
  return players.value.filter(p => !isJoker(p.id) && !race.players.includes(p.id))
})

</script>

<template>
  <div class="content-area">

    <!-- Tournament List -->
    <div v-if="showTournamentList" class="space-y-6">
      <div class="mk-panel overflow-hidden">
        <div class="mk-plate mk-plate-red flex items-center justify-between gap-3">
          <span>Your Tournaments</span>
          <button @click="showNewTournamentCreation" class="btn btn-accent py-1 text-xs">
            <Plus :size="16" />
            New Tournament
          </button>
        </div>
        <div class="p-6">

        <div v-if="bracketStore.loading" class="text-center py-8 text-muted">
          Loading tournaments...
        </div>

        <div v-else-if="bracketStore.tournaments.length === 0" class="text-center py-12">
          <Trophy :size="48" class="mx-auto mb-4 text-muted opacity-50" />
          <p class="text-muted mb-4">No tournaments yet.</p>
          <button @click="showNewTournamentCreation" class="btn btn-primary">
            <Plus :size="20" />
            Create Tournament
          </button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="tournament in bracketStore.tournaments"
            :key="tournament.id"
            class="mk-panel-sm p-4 transition-transform hover:-translate-y-0.5"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                  <h3 class="font-mk text-lg uppercase tracking-wide text-ink">{{ tournament.name }}</h3>
                  <span v-if="tournament.completed" class="mk-flag mk-flag-done">
                    <CheckCircle2 :size="12" />
                    Completed
                  </span>
                  <span v-else class="mk-flag mk-flag-ready">In Progress</span>
                </div>
                <div class="text-sm text-muted flex items-center gap-4">
                  <span class="flex items-center gap-1">
                    <Calendar :size="14" />
                    {{ new Date(tournament.created_at).toLocaleDateString() }}
                  </span>
                  <span>{{ (tournament.players as any[]).length }} players</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="loadTournament(tournament.id)"
                  class="btn btn-ghost btn-sm"
                >
                  <List :size="16" />
                  {{ tournament.completed ? 'View' : 'Continue' }}
                </button>
                <button
                  @click="bracketStore.deleteTournament(tournament.id)"
                  class="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  title="Delete tournament"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- New Tournament / Player Setup -->
    <div v-else-if="showNewTournamentForm" class="space-y-6">
      <div class="mk-panel overflow-hidden">
        <div class="mk-plate mk-plate-red flex items-center justify-between gap-3">
          <span>Create New Tournament</span>
          <button @click="cancelNewTournament" class="btn btn-ghost py-1 text-xs">
            ← Back to list
          </button>
        </div>
        <div class="mk-checker h-3 border-b-[3px] border-ink"></div>

        <div class="p-6">
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Tournament Name</label>
          <input
            v-model="tournamentName"
            type="text"
            placeholder="E.g., Friday Night Beeriokart"
            class="input w-full"
            required
          />
        </div>

        <div class="flex items-center justify-between mb-4">
          <h3 class="font-mk text-base uppercase tracking-wide text-ink">Add drivers</h3>
          <button @click="fillTestNames" class="btn btn-ghost text-xs">
            🎮 Fill test-names
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div
            v-for="(name, index) in playerNames"
            :key="index"
            class="flex items-center gap-2"
          >
            <!-- Preview the colour this driver will race in all tournament -->
            <div
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border-2 border-ink font-mk text-[11px] leading-none transition-colors"
              :style="name.trim()
                ? { backgroundColor: setupColors[index]?.hex, color: setupColors[index]?.contrast }
                : { backgroundColor: '#e4e4e7', color: '#71717a' }"
            >
              {{ index + 1 }}
            </div>
            <input
              v-model="playerNames[index]"
              type="text"
              :placeholder="`Driver ${index + 1}`"
              class="input flex-1"
            />
          </div>
        </div>

        <button
          @click="startTournament"
          class="btn btn-primary w-full"
          :disabled="bracketStore.loading"
        >
          <Trophy :size="20" />
          {{ bracketStore.loading ? 'Creating...' : 'Start Tournament' }}
        </button>
        <p class="text-sm text-muted mt-4 text-center">
          A minimum of 12 players is required for this tournament style to work.
        </p>
        </div>
      </div>
    </div>

    <!-- Tournament Bracket -->
    <div v-else-if="currentRound" class="space-y-6">
      <div class="card p-4 flex items-center justify-between">
        <button @click="backToTournamentList" class="btn btn-ghost">
          ← Back to tournaments
        </button>
        <h2 class="text-lg font-semibold">{{ bracketStore.currentTournament?.name }}</h2>
        <div></div>
      </div>
      <!-- Podium takes over once the grand finale is in the books -->
      <div v-if="grandFinaleResult" class="card p-6">
        <BracketPodium :results="grandFinaleResult" />
      </div>

      <!-- Editing a race slides an enlarged editor into the left third of the
           tournament view; the whole bracket card moves into what is left and
           rescales itself to fit. -->
      <div class="flex items-start">
      <div
        class="shrink-0 overflow-hidden transition-[width] duration-500 ease-in-out"
        :class="editingRace ? 'w-1/3' : 'w-0'"
      >
        <div class="min-w-[320px] pr-6">
          <Transition name="editor">
            <RaceEditorPanel
              v-if="editingRace"
              :race="editingRace"
              :race-index="editingRace.slot"
              :round="editingRace.round"
              :editing-placements="editingPlacements"
              :get-player-by-id="getPlayerById"
              :get-position-color="getPositionColor"
              :get-outcome="getOutcome"
              :player-colors="playerColors"
              :is-winner-round="winnerRounds.includes(editingRace.round)"
              @move-up="movePlayerUp"
              @move-down="movePlayerDown"
              @reorder="reorderPlayers"
              @save="saveRaceResult"
              @cancel="cancelEditingRace"
              @swap-player="openSwapModal"
            />
          </Transition>
        </div>
      </div>

      <div class="min-w-0 flex-1">
      <!-- Bracket overview -->
      <div class="card p-6 space-y-6" :key="`bracket-${refreshKey}`">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="section-title">Tournament bracket</h2>
          <div class="flex items-center gap-2">
          <button
            @click="showRules = true"
            class="btn btn-ghost gap-1.5 px-3 py-1.5 text-xs"
            title="Joker, swaps and how to read the bracket"
          >
            <HelpCircle :size="14" />
            Rules
          </button>
          </div>
        </div>

        <!-- Bracket flow: rounds as columns, connected by one line per player -->
        <BracketFlow
          :races="races"
          :bracket-overview="bracketOverview"
          :player-colors="playerColors"
          :focused-player-id="focusedPlayerId"
          :is-elimination="isElimination"
          :revision="refreshKey"
        >
          <template #round="{ round, races: roundRaces }">
            <section class="mk-panel overflow-hidden">
              <div
                class="mk-plate flex items-center justify-between gap-2"
                :class="round === 'Grand finale'
                  ? 'mk-plate-gold'
                  : winnerRounds.includes(round)
                  ? 'mk-plate-green'
                  : 'mk-plate-red'"
              >
                <span>{{ round }}</span>
                <span
                  v-if="currentRound === round"
                  class="rounded border-2 border-ink bg-white px-1.5 py-0.5 text-[9px] text-ink"
                  style="text-shadow: none"
                >
                  NOW
                </span>
              </div>
              <div v-if="round === 'Grand finale'" class="mk-checker h-3 border-b-2 border-ink"></div>
              <div
                class="gap-2.5 p-2.5"
                :class="round === 'Winner bracket 1' && roundRaces.length > 2
                  ? 'grid grid-cols-2'
                  : 'flex flex-col'"
              >
                <BracketRaceCard
                  v-for="(race, raceIndex) in roundRaces"
                  :key="race?.id || `placeholder_${round}_${raceIndex}`"
                  :race="race"
                  :race-index="raceIndex"
                  :round="round"
                  :is-active="race?.id === editingRaceId"
                  :get-player-by-id="getPlayerById"
                  :get-position-color="getPositionColor"
                  :get-race-rows="getRaceRows"
                  :player-colors="playerColors"
                  :focused-player-id="focusedPlayerId"
                  @start-edit="startEditingRace(race!.id)"
                  @focus-player="setHoveredPlayer"
                />
              </div>
            </section>
          </template>
        </BracketFlow>
      </div>
      </div>
      </div>
    </div>

    <!-- Rules Modal -->
    <div
      v-if="showRules"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
      @click="showRules = false"
    >
      <div class="w-full max-w-3xl" @click.stop>
        <div class="mk-panel overflow-hidden">
          <div class="mk-plate mk-plate-red flex items-center justify-between gap-3">
            <span>Beeriokart Rules</span>
            <button
              @click="showRules = false"
              class="rounded border-2 border-ink bg-white px-2 py-0.5 text-[10px] text-ink"
              style="text-shadow: none"
            >
              Close
            </button>
          </div>
          <div class="mk-checker h-3 border-b-[3px] border-ink"></div>
          <div class="max-h-[75vh] overflow-y-auto p-4">
            <BracketLegend />
          </div>
        </div>
      </div>
    </div>

    <!-- Swap Player Modal -->
    <div
      v-if="swapModalOpen"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click="closeSwapModal"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        @click.stop
      >
        <h3 class="text-lg font-semibold mb-4">Swap Player</h3>
        <p class="text-sm text-muted mb-4">
          Select a replacement player:
        </p>
        <div class="space-y-2">
          <button
            v-for="player in availablePlayersForSwap"
            :key="player.id"
            @click="swapPlayer(player.id)"
            class="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <div class="font-medium">{{ player.name }}</div>
          </button>
        </div>
        <div class="mt-4 flex justify-end">
          <button @click="closeSwapModal" class="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Floating Map Spinner Button (only show in tournament view) -->
  <button
    v-if="currentRound && !showTournamentList && !showNewTournamentForm"
    @click="showMapSpinner = true"
    class="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
    title="Spin for a map"
  >
    <LoaderPinwheel size="24"></LoaderPinwheel>
  </button>

  <!-- Map Wheel Spinner Modal -->
  <MapWheelSpinner
    v-if="showMapSpinner"
    @close="showMapSpinner = false"
    @selected="handleMapSelected"
  />
</template>


<style scoped>
/* The editor fades and slides in as its column widens, so the panel appears to
   grow out of the bracket rather than pop in on top of it. */
.editor-enter-active,
.editor-leave-active {
  transition: opacity 320ms ease, transform 320ms ease;
}

.editor-enter-from,
.editor-leave-to {
  opacity: 0;
  transform: translateX(-16px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .editor-enter-active,
  .editor-leave-active {
    transition: none;
  }
}

.beer-background {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
}

/* Foam layer at the top */
.beer-foam {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 25%;
  background: linear-gradient(180deg, #f5f5dc 0%, #fef3c7 25%, #fde68a 100%);
  z-index: 0;
}

/* Beer color background */
.beer-background::before {
  content: '';
  position: absolute;
  top: 25%;
  left: 0;
  width: 100%;
  height: 75%;
  background: linear-gradient(180deg, #f5a623 0%, #d4860a 50%, #b8720a 100%);
  z-index: 0;
}

/* Content area stays above background */
.content-area {
  position: relative;
  z-index: 10;
}

/* Floating bubbles */
.beer-bubble {
  position: absolute;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4));
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
  animation: beer-bubble-rise 6s infinite ease-in;
  z-index: 5;
}

/* Position and timing for each bubble */
.bubble-1 {
  width: 12px;
  height: 12px;
  left: 10%;
  bottom: 20%;
  animation-delay: 0s;
  animation-duration: 6s;
}

.bubble-2 {
  width: 8px;
  height: 8px;
  left: 25%;
  bottom: 30%;
  animation-delay: 1s;
  animation-duration: 7s;
}

.bubble-3 {
  width: 10px;
  height: 10px;
  left: 50%;
  bottom: 15%;
  animation-delay: 2s;
  animation-duration: 6s;
}

.bubble-4 {
  width: 14px;
  height: 14px;
  left: 70%;
  bottom: 25%;
  animation-delay: 0.5s;
  animation-duration: 8s;
}

.bubble-5 {
  width: 9px;
  height: 9px;
  left: 85%;
  bottom: 10%;
  animation-delay: 1.5s;
  animation-duration: 7s;
}

@keyframes beer-bubble-rise {
  0% {
    transform: translateY(0) translateX(0);
    opacity: 1;
  }
  25% {
    transform: translateY(-200px) translateX(20px);
    opacity: 1;
  }
  75% {
    transform: translateY(-600px) translateX(40px);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-800px) translateX(50px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .beer-bubble {
    animation: none;
    opacity: 0.3;
  }
}
</style>
