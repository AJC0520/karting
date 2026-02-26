<script setup lang="ts">
import { computed } from 'vue'
import type { Tournament, ID } from '@/types'
import { getLeaderboard } from '@/utils/stats'

const props = defineProps<{
  tournament: Tournament
}>()

type PlayerRaceData = {
  playerId: ID
  playerName: string
  positions: (number | null)[] // tournament position after each race
  color: string
}

const racesSorted = computed(() => 
  [...props.tournament.races].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
)

// Get top 3 players based on current standings
const top3Players = computed(() => {
  const leaderboard = getLeaderboard(props.tournament)
  return leaderboard.slice(0, 3)
})

const colors = ['#ef4444', '#f97316', '#3b82f6'] // red, orange, blue

// Calculate tournament standings after each race
const graphData = computed((): PlayerRaceData[] => {
  const playerPositionsOverTime = new Map<ID, (number | null)[]>()
  
  // Initialize arrays for all players
  props.tournament.players.forEach(player => {
    playerPositionsOverTime.set(player.id, [])
  })
  
  // For each race, calculate tournament standings up to that point
  racesSorted.value.forEach((race, raceIndex) => {
    // Create a temporary tournament with races up to this point
    const partialTournament = {
      ...props.tournament,
      races: racesSorted.value.slice(0, raceIndex + 1)
    }
    
    // Get leaderboard after this race
    const leaderboard = getLeaderboard(partialTournament)
    
    // Record each player's position
    leaderboard.forEach((entry, position) => {
      const positions = playerPositionsOverTime.get(entry.player.id)
      if (positions) {
        positions.push(position + 1)
      }
    })
    
    // For players not in leaderboard (no participation), add null
    playerPositionsOverTime.forEach((positions, playerId) => {
      if (positions.length <= raceIndex) {
        positions.push(null)
      }
    })
  })
  
  // Return data for top 3 players
  return top3Players.value.map((entry, index) => {
    return {
      playerId: entry.player.id,
      playerName: entry.player.name,
      positions: playerPositionsOverTime.get(entry.player.id) || [],
      color: colors[index] || '#6b7280'
    }
  })
})

// SVG dimensions
const width = 800
const height = 300
const padding = { top: 40, right: 60, bottom: 40, left: 60 }
const graphWidth = width - padding.left - padding.right
const graphHeight = height - padding.top - padding.bottom

const maxPosition = computed(() => {
  let max = 3
  graphData.value.forEach(player => {
    player.positions.forEach(pos => {
      if (pos !== null && pos > max) max = pos
    })
  })
  return max
})

const getX = (raceIndex: number): number => {
  const totalRaces = racesSorted.value.length
  if (totalRaces <= 1) return padding.left + graphWidth / 2
  return padding.left + (raceIndex / (totalRaces - 1)) * graphWidth
}

const getY = (position: number): number => {
  // Invert Y so position 1 is at top
  return padding.top + ((position - 1) / (maxPosition.value - 1)) * graphHeight
}

const getPathData = (positions: (number | null)[]): string => {
  const points: string[] = []
  let lastValidIndex = -1
  
  positions.forEach((pos, index) => {
    if (pos !== null) {
      const x = getX(index)
      const y = getY(pos)
      
      if (points.length === 0) {
        points.push(`M ${x} ${y}`)
      } else {
        points.push(`L ${x} ${y}`)
      }
      lastValidIndex = index
    }
  })
  
  return points.join(' ')
}

const yAxisLabels = computed(() => {
  const labels = []
  for (let i = 1; i <= maxPosition.value; i++) {
    labels.push({
      position: i,
      y: getY(i),
      label: i === 1 ? '1st' : i === 2 ? '2nd' : i === 3 ? '3rd' : `${i}th`
    })
  }
  return labels
})

const xAxisLabels = computed(() => {
  const totalRaces = racesSorted.value.length
  if (totalRaces === 0) return []
  
  // Show labels for every 5th race or fewer if not many races
  const step = totalRaces > 20 ? 5 : totalRaces > 10 ? 2 : 1
  const labels = []
  
  for (let i = 0; i < totalRaces; i += step) {
    labels.push({
      index: i,
      x: getX(i),
      label: `${i + 1}`
    })
  }
  
  // Always show last race
  if (labels[labels.length - 1]?.index !== totalRaces - 1) {
    labels.push({
      index: totalRaces - 1,
      x: getX(totalRaces - 1),
      label: `${totalRaces}`
    })
  }
  
  return labels
})
</script>

<template>
  <div class="card p-6 space-y-4">
    <div>
      <h3 class="text-lg font-semibold">Tournament Leadership</h3>
      <p class="text-sm text-muted mt-1">Overall standings after each race</p>
    </div>
    
    <div v-if="racesSorted.length > 0" class="space-y-4">
      <!-- SVG Graph -->
      <div class="w-full overflow-x-auto">
        <svg 
          :viewBox="`0 0 ${width} ${height}`" 
          class="w-full" 
          style="max-width: 100%; height: auto;"
        >
          <!-- Grid lines -->
          <g class="opacity-20">
            <line
              v-for="label in yAxisLabels"
              :key="label.position"
              :x1="padding.left"
              :y1="label.y"
              :x2="width - padding.right"
              :y2="label.y"
              stroke="currentColor"
              stroke-width="1"
              stroke-dasharray="4 4"
            />
          </g>
          
          <!-- Y-axis labels -->
          <g class="text-xs" fill="currentColor">
            <text
              v-for="label in yAxisLabels"
              :key="label.position"
              :x="padding.left - 10"
              :y="label.y + 4"
              text-anchor="end"
              class="fill-zinc-600 dark:fill-zinc-400"
            >
              {{ label.label }}
            </text>
          </g>
          
          <!-- X-axis labels -->
          <g class="text-xs" fill="currentColor">
            <text
              v-for="label in xAxisLabels"
              :key="label.index"
              :x="label.x"
              :y="height - padding.bottom + 20"
              text-anchor="middle"
              class="fill-zinc-600 dark:fill-zinc-400"
            >
              {{ label.label }}
            </text>
          </g>
          
          <!-- X-axis label -->
          <text
            :x="width / 2"
            :y="height - 5"
            text-anchor="middle"
            class="text-xs fill-zinc-500 dark:fill-zinc-500"
          >
            Race Number
          </text>
          
          <!-- Lines for each player -->
          <g v-for="player in graphData" :key="player.playerId">
            <path
              :d="getPathData(player.positions)"
              :stroke="player.color"
              stroke-width="3"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            
            <!-- Data points -->
            <template v-for="(pos, index) in player.positions" :key="`${player.playerId}-${index}`">
              <circle
                v-if="pos !== null"
                :cx="getX(index)"
                :cy="getY(pos)"
                r="4"
                :fill="player.color"
                class="cursor-pointer hover:r-6 transition-all"
              >
                <title>{{ player.playerName }} - After Race {{ index + 1 }}: {{ pos === 1 ? '1st' : pos === 2 ? '2nd' : pos === 3 ? '3rd' : `${pos}th` }} Place Overall</title>
              </circle>
            </template>
          </g>
        </svg>
      </div>
      
      <!-- Legend -->
      <div class="flex flex-wrap gap-6 justify-center text-sm pt-4 border-t border-black/5">
        <div
          v-for="player in graphData"
          :key="player.playerId"
          class="flex items-center gap-2"
        >
          <div
            class="w-4 h-1 rounded-full"
            :style="{ backgroundColor: player.color }"
          ></div>
          <span class="font-semibold">{{ player.playerName }}</span>
        </div>
      </div>
    </div>
    
    <div v-else class="text-sm text-muted text-center py-8">
      No races yet. Add races to see leadership over time.
    </div>
  </div>
</template>
