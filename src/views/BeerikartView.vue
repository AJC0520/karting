<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { Trophy, Plus, List, Calendar, CheckCircle2, Trash2, Map, LoaderPinwheel } from 'lucide-vue-next'
import { useBracketStore, type BracketPlayer, type BracketRaceLocal } from '@/stores/bracketStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import BracketLegend from '@/components/BracketLegend.vue'
import BracketPodium from '@/components/BracketPodium.vue'
import BracketRaceCard from '@/components/BracketRaceCard.vue'
import MapWheelSpinner from '@/components/MapWheelSpinner.vue'

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
  
  // Save to database
  await bracketStore.saveRace(newRaces[raceIndex] as BracketRaceLocal)
  
  editingRaceId.value = null
  editingPlacements.value = []

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
    <div class="mb-6">
      <h1 class="text-3xl font-semibold mb-2">🍺 Beeriokart</h1>
    </div>

    <!-- Tournament List -->
    <div v-if="showTournamentList" class="space-y-6">
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="section-title">Your Tournaments</h2>
          <button @click="showNewTournamentCreation" class="btn btn-primary">
            <Plus :size="20" />
            New Tournament
          </button>
        </div>

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
            class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-semibold text-lg">{{ tournament.name }}</h3>
                  <span
                    v-if="tournament.completed"
                    class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800"
                  >
                    <CheckCircle2 :size="12" />
                    Completed
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800"
                  >
                    In Progress
                  </span>
                </div>
                <div class="text-sm text-muted flex items-center gap-4">
                  <span class="flex items-center gap-1">
                    <Calendar :size="14" />
                    {{ new Date(tournament.created_at).toLocaleDateString() }}
                  </span>
                  <span>{{ (tournament.players as any[]).length }} players</span>
                  <span v-if="tournament.current_round">{{ tournament.current_round }}</span>
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

    <!-- New Tournament / Player Setup -->
    <div v-else-if="showNewTournamentForm" class="space-y-6">
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title">Create New Tournament</h2>
          <button @click="cancelNewTournament" class="btn btn-ghost text-sm">
            ← Back to list
          </button>
        </div>

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
          <h3 class="text-lg font-semibold">Add players</h3>
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
            <div
              class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold bg-zinc-200 text-zinc-700"
            >
              {{ index + 1 }}
            </div>
            <input
              v-model="playerNames[index]"
              type="text"
              :placeholder="`Player ${index + 1}`"
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

    <!-- Tournament Bracket -->
    <div v-else-if="currentRound" class="space-y-6">
      <div class="card p-4 flex items-center justify-between">
        <button @click="backToTournamentList" class="btn btn-ghost">
          ← Back to tournaments
        </button>
        <h2 class="text-lg font-semibold">{{ bracketStore.currentTournament?.name }}</h2>
        <div></div>
      </div>
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
                  :open-swap-modal="openSwapModal"
                  @start-edit="startEditingRace(race!.id)"
                  @move-up="movePlayerUp"
                  @move-down="movePlayerDown"
                  @reorder="reorderPlayers"
                  @save="saveRaceResult"
                  @cancel="cancelEditingRace"
                  @swap-player="openSwapModal"
                />
              </div>
            </div>
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
