<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trophy } from 'lucide-vue-next'

interface BracketPlayer {
  id: string
  name: string
  color: string
}

interface BracketRace {
  id: string
  round: string
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

const colors = [
  '#4472CA', // Blue
  '#FF6B35', // Orange  
  '#B565D8', // Purple
  '#2DD881', // Green
  '#F7D038', // Yellow
  '#569399', // Teal
  '#E85D75', // Pink
  '#95CD41', // Lime
  '#FF9234', // Light orange
  '#5DADE2', // Light blue
  '#EC7063', // Salmon
  '#58D68D', // Mint
  '#F4D03F', // Gold
  '#AF7AC5', // Lavender
  '#DC7633', // Brown
  '#17202A', // Black
]

const collectPlayers = () => {
  players.value = playerNames.value
    .filter(name => name.trim())
    .map((name, index) => ({
      id: `p${Date.now()}_${index}`,
      name: name.trim(),
      color: colors[index % colors.length],
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
  for (let i = 0; i < shuffled.length; i += 4) {
    const racePlayers = shuffled.slice(i, i + 4)
    if (racePlayers.length >= 3) {
      races.value.push({
        id: `race${Date.now()}_${i}`,
        round: 'Winner bracket 1',
        players: racePlayers.map(p => p.id),
        placements: [],
        completed: false,
      })
    }
  }
}

const getRacesForRound = (round: string) => {
  return races.value.filter(r => r.round === round)
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

const saveRaceResult = () => {
  if (!editingRaceId.value) return
  
  const race = races.value.find(r => r.id === editingRaceId.value)
  if (!race) return
  
  race.placements = [...editingPlacements.value]
  race.completed = true
  
  editingRaceId.value = null
  editingPlacements.value = []
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
        <h2 class="section-title mb-4">Legg til spillere (maks 16)</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div
            v-for="(name, index) in playerNames"
            :key="index"
            class="flex items-center gap-2"
          >
            <div
              class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
              :style="{ backgroundColor: colors[index % colors.length] }"
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
            class="p-4 rounded-xl border border-black/10 bg-white/50"
          >
            <div class="font-semibold mb-3">Race {{ activeRaces.indexOf(race) + 1 }}</div>
            
            <!-- Editing mode -->
            <div v-if="editingRaceId === race.id" class="space-y-3">
              <div class="text-sm text-muted mb-2">Dra for å endre plassering (topp = 1. plass)</div>
              <div class="space-y-2">
                <div
                  v-for="(playerId, index) in editingPlacements"
                  :key="playerId"
                  class="flex items-center gap-2 p-2 rounded-lg"
                  :style="{ 
                    backgroundColor: getPlayerById(playerId)?.color + '15',
                    borderLeft: `4px solid ${getPlayerById(playerId)?.color}`
                  }"
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
                  <div class="font-bold text-lg w-8 text-center">{{ index + 1 }}.</div>
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
                  class="flex items-center gap-3 p-2 rounded-lg"
                  :style="{ 
                    backgroundColor: getPlayerById(playerId)?.color + '15',
                    borderLeft: `4px solid ${getPlayerById(playerId)?.color}`
                  }"
                >
                  <div class="font-bold text-lg w-8">{{ index + 1 }}.</div>
                  <span class="font-semibold">{{ getPlayerById(playerId)?.name }}</span>
                </div>
                <button @click="startEditingRace(race.id)" class="btn btn-ghost w-full mt-2 text-sm">
                  Endre resultat
                </button>
              </div>
              <div v-else>
                <div class="space-y-2 mb-3">
                  <div
                    v-for="playerId in race.players"
                    :key="playerId"
                    class="flex items-center gap-3 p-2 rounded-lg"
                    :style="{ 
                      backgroundColor: getPlayerById(playerId)?.color + '15',
                      borderLeft: `4px solid ${getPlayerById(playerId)?.color}`
                    }"
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

      <!-- Bracket visualization placeholder -->
      <div class="card p-6">
        <h2 class="section-title mb-4">Bracket oversikt</h2>
        <div class="text-sm text-muted">
          Bracket-visualisering kommer her (Winner bracket, Loser bracket, Finals)
        </div>
      </div>
    </div>
  </div>
</template>
