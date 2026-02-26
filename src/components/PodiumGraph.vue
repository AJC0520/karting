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
  points: (number | null)[] // total points after each race
  color: string
}

const racesSorted = computed(() => 
  [...props.tournament.races].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
)

// Get top 4 players based on current standings
const top4Players = computed(() => {
  const leaderboard = getLeaderboard(props.tournament)
  return leaderboard.slice(0, 4)
})

const colors = ['#ef4444', '#f97316', '#3b82f6', '#a855f7'] // red, orange, blue, purple

// Calculate tournament standings after each race
const graphData = computed((): PlayerRaceData[] => {
  const playerPointsOverTime = new Map<ID, (number | null)[]>()
  
  // Initialize arrays for all players
  props.tournament.players.forEach(player => {
    playerPointsOverTime.set(player.id, [])
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
    
    // Record each player's total points
    leaderboard.forEach((entry) => {
      const points = playerPointsOverTime.get(entry.player.id)
      if (points) {
        points.push(entry.totalPoints)
      }
    })
    
    // For players not in leaderboard (no participation), add null
    playerPointsOverTime.forEach((points, playerId) => {
      if (points.length <= raceIndex) {
        points.push(null)
      }
    })
  })
  
  // Return data for top 4 players
  return top4Players.value.map((entry, index) => {
    return {
      playerId: entry.player.id,
      playerName: entry.player.name,
      points: playerPointsOverTime.get(entry.player.id) || [],
      color: colors[index] || '#6b7280'
    }
  })
})

// SVG dimensions
const width = 800
const height = 500
const padding = { top: 60, right: 60, bottom: 60, left: 60 }
const graphWidth = width - padding.left - padding.right
const graphHeight = height - padding.top - padding.bottom

const maxPoints = computed(() => {
  let max = 0
  graphData.value.forEach(player => {
    player.points.forEach(pts => {
      if (pts !== null && pts > max) max = pts
    })
  })
  // Add some padding to the top
  return Math.ceil(max * 1.1)
})

const getX = (raceIndex: number): number => {
  const totalRaces = racesSorted.value.length
  if (totalRaces <= 1) return padding.left + graphWidth / 2
  return padding.left + (raceIndex / (totalRaces - 1)) * graphWidth
}

const getY = (points: number): number => {
  // Invert Y so higher points are at top
  if (maxPoints.value === 0) return padding.top + graphHeight
  return padding.top + graphHeight - (points / maxPoints.value) * graphHeight
}

const getPathData = (points: (number | null)[]): string => {
  const validPoints: { x: number; y: number; index: number }[] = []
  
  // Collect all valid points
  points.forEach((pts, index) => {
    if (pts !== null) {
      validPoints.push({
        x: getX(index),
        y: getY(pts),
        index
      })
    }
  })
  
  if (validPoints.length === 0) return ''
  if (validPoints.length === 1) return `M ${validPoints[0].x} ${validPoints[0].y}`
  
  const path: string[] = []
  path.push(`M ${validPoints[0].x} ${validPoints[0].y}`)
  
  for (let i = 0; i < validPoints.length - 1; i++) {
    const current = validPoints[i]
    const next = validPoints[i + 1]
    
    // Check if position changed (y-coordinate different)
    if (Math.abs(current.y - next.y) < 0.1) {
      // Position stayed the same - use straight line
      path.push(`L ${next.x} ${next.y}`)
    } else {
      // Position changed - use smooth rounded curve
      const midX = (current.x + next.x) / 2
      
      // Control points for a smooth S-curve transition
      const cp1x = current.x + (midX - current.x) * 0.8
      const cp1y = current.y
      const cp2x = next.x - (next.x - midX) * 0.8
      const cp2y = next.y
      
      path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`)
    }
  }
  
  return path.join(' ')
}

const yAxisLabels = computed(() => {
  const labels = []
  const max = maxPoints.value
  if (max === 0) return []
  
  // Create 5-6 evenly spaced labels
  const step = Math.ceil(max / 5)
  for (let i = 0; i <= max; i += step) {
    labels.push({
      points: i,
      y: getY(i),
      label: `${i}`
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

// Track leadership changes (when 1st place changes)
const leadershipChanges = computed(() => {
  const changes: Array<{
    raceIndex: number
    x: number
    y: number
    newLeader: string
    previousLeader: string
    newLeaderColor: string
    previousLeaderColor: string
  }> = []
  
  let previousLeader: ID | null = null
  
  racesSorted.value.forEach((race, raceIndex) => {
    // Create a temporary tournament with races up to this point
    const partialTournament = {
      ...props.tournament,
      races: racesSorted.value.slice(0, raceIndex + 1)
    }
    
    // Get leaderboard after this race
    const leaderboard = getLeaderboard(partialTournament)
    
    if (leaderboard.length > 0) {
      const currentLeader = leaderboard[0].player.id
      
      // Check if leader changed
      if (previousLeader !== null && currentLeader !== previousLeader) {
        const previousLeaderName = props.tournament.players.find(p => p.id === previousLeader)?.name || ''
        const currentLeaderName = leaderboard[0].player.name
        const currentLeaderPoints = leaderboard[0].totalPoints
        
        // Find colors of both leaders
        const newLeaderData = graphData.value.find(p => p.playerId === currentLeader)
        const previousLeaderData = graphData.value.find(p => p.playerId === previousLeader)
        
        changes.push({
          raceIndex,
          x: getX(raceIndex),
          y: getY(currentLeaderPoints), // Y position based on points
          newLeader: currentLeaderName,
          previousLeader: previousLeaderName,
          newLeaderColor: newLeaderData?.color || '#ef4444',
          previousLeaderColor: previousLeaderData?.color || '#6b7280'
        })
      }
      
      previousLeader = currentLeader
    }
  })
  
  return changes
})
</script>

<template>
  <div class="card p-4 space-y-3">
    <div>
      <h3 class="text-lg font-semibold">Tournament Leadership</h3>
      <p class="text-sm text-muted mt-1">Total points accumulated after each race</p>
    </div>
    
    <div v-if="racesSorted.length > 0" class="relative">
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
              :key="label.points"
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
              :key="label.points"
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
          
          <!-- Y-axis label -->
          <text
            :x="-height / 2"
            :y="15"
            text-anchor="middle"
            transform="rotate(-90)"
            class="text-xs fill-zinc-500 dark:fill-zinc-500"
          >
            Total Points
          </text>
          
          <!-- Lines for each player -->
          <g v-for="player in graphData" :key="player.playerId">
            <path
              :d="getPathData(player.points)"
              :stroke="player.color"
              stroke-width="3"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>
          
          <!-- Leadership change markers -->
          <g v-for="(change, index) in leadershipChanges" :key="`change-${index}`">
            <!-- Vertical line marker -->
            <line
              :x1="change.x"
              :y1="padding.top"
              :x2="change.x"
              :y2="height - padding.bottom"
              stroke="currentColor"
              stroke-width="1"
              stroke-dasharray="3 3"
              class="opacity-30"
            />
            
            <!-- Circle marker at top -->
            <circle
              :cx="change.x"
              :cy="change.y"
              r="5"
              :fill="change.newLeaderColor"
              stroke="white"
              stroke-width="2"
            />
            
            <!-- Text label -->
            <g>
              <!-- Background rect for readability -->
              <rect
                :x="change.x - 70"
                :y="change.y - 35"
                width="140"
                height="26"
                fill="white"
                stroke="#e5e7eb"
                stroke-width="1"
                rx="4"
                opacity="0.95"
              />
              
              <!-- Text showing overtake -->
              <text
                :x="change.x"
                :y="change.y - 18"
                text-anchor="middle"
                class="text-xs font-medium"
              >
                <tspan :fill="change.newLeaderColor" font-weight="700">{{ change.newLeader }}</tspan>
                <tspan fill="#6b7280"> overtakes </tspan>
                <tspan :fill="change.previousLeaderColor" font-weight="700">{{ change.previousLeader }}</tspan>
              </text>
            </g>
          </g>
        </svg>
      </div>
      
      <!-- Legend positioned over graph -->
      <div class="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div class="flex flex-wrap gap-4 text-sm justify-center">
          <div
            v-for="player in graphData"
            :key="player.playerId"
            class="flex items-center gap-2"
          >
            <div
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: player.color }"
            ></div>
            <span class="font-semibold">{{ player.playerName }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="text-sm text-muted text-center py-8">
      No races yet. Add races to see leadership over time.
    </div>
  </div>
</template>
