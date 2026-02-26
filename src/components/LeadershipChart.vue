<script setup lang="ts">
import { computed } from 'vue'
import type { Tournament, ID } from '@/types'
import { getLeaderboard } from '@/utils/stats'
import { formatDate } from '@/utils/format'

const props = defineProps<{
  tournament: Tournament
}>()

type LeadershipPoint = {
  raceIndex: number
  raceDate: string
  playerId: ID
  playerName: string
  points: number
}

const leadershipHistory = computed(() => {
  const races = [...props.tournament.races].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  
  const history: LeadershipPoint[] = []
  
  // Create a tournament snapshot for each race
  races.forEach((race, index) => {
    const tournamentSnapshot = {
      ...props.tournament,
      races: races.slice(0, index + 1)
    }
    
    const leaderboard = getLeaderboard(tournamentSnapshot)
    if (leaderboard.length > 0) {
      const leader = leaderboard[0]
      history.push({
        raceIndex: index + 1,
        raceDate: race.timestamp,
        playerId: leader.player.id,
        playerName: leader.player.name,
        points: leader.totalPoints
      })
    }
  })
  
  return history
})

// Group consecutive races with the same leader
const leadershipSegments = computed(() => {
  const segments: Array<{ player: string; playerId: ID; start: number; end: number; color: string }> = []
  
  if (leadershipHistory.value.length === 0) return segments
  
  // Generate consistent colors for players
  const playerColors = new Map<ID, string>()
  const colors = [
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#10b981', // green
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ]
  
  let currentLeader = leadershipHistory.value[0].playerId
  let currentStart = 0
  
  leadershipHistory.value.forEach((point, index) => {
    if (!playerColors.has(point.playerId)) {
      playerColors.set(point.playerId, colors[playerColors.size % colors.length])
    }
    
    if (point.playerId !== currentLeader || index === leadershipHistory.value.length - 1) {
      const endIndex = index === leadershipHistory.value.length - 1 && point.playerId === currentLeader 
        ? index 
        : index - 1
      
      const leaderName = leadershipHistory.value[currentStart].playerName
      segments.push({
        player: leaderName,
        playerId: currentLeader,
        start: currentStart,
        end: endIndex,
        color: playerColors.get(currentLeader) || colors[0]
      })
      
      if (index < leadershipHistory.value.length && point.playerId !== currentLeader) {
        currentLeader = point.playerId
        currentStart = index
      }
    }
  })
  
  // Handle last segment if needed
  if (segments.length === 0 || segments[segments.length - 1].end < leadershipHistory.value.length - 1) {
    const lastPoint = leadershipHistory.value[leadershipHistory.value.length - 1]
    const existingSegment = segments.find(s => s.playerId === lastPoint.playerId)
    if (!existingSegment || existingSegment.end < leadershipHistory.value.length - 1) {
      segments.push({
        player: lastPoint.playerName,
        playerId: lastPoint.playerId,
        start: currentStart,
        end: leadershipHistory.value.length - 1,
        color: playerColors.get(lastPoint.playerId) || colors[0]
      })
    }
  }
  
  return segments
})

// Track leadership changes for labels
const leadershipChanges = computed(() => {
  const changes: Array<{
    raceIndex: number
    position: number
    newLeader: string
    previousLeader: string
  }> = []
  
  for (let i = 1; i < leadershipHistory.value.length; i++) {
    const current = leadershipHistory.value[i]
    const previous = leadershipHistory.value[i - 1]
    
    if (current.playerId !== previous.playerId) {
      changes.push({
        raceIndex: i,
        position: (i / totalRaces.value) * 100,
        newLeader: current.playerName,
        previousLeader: previous.playerName
      })
    }
  }
  
  return changes
})

const totalRaces = computed(() => leadershipHistory.value.length)

const getSegmentWidth = (segment: { start: number; end: number }) => {
  if (totalRaces.value === 0) return 0
  return ((segment.end - segment.start + 1) / totalRaces.value) * 100
}

const getSegmentPosition = (segment: { start: number }) => {
  if (totalRaces.value === 0) return 0
  return (segment.start / totalRaces.value) * 100
}
</script>

<template>
  <div class="card p-6 space-y-4">
    <div>
      <h3 class="text-lg font-semibold">Leadership Over Time</h3>
      <p class="text-sm text-muted mt-1">Who was in first place after each race</p>
    </div>
    
    <div v-if="leadershipHistory.length > 0" class="space-y-4">
      <!-- Timeline Bar -->
      <div class="relative h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
        <div
          v-for="(segment, index) in leadershipSegments"
          :key="index"
          class="absolute h-full flex items-center justify-center text-white font-semibold text-sm transition-all hover:opacity-90 cursor-default"
          :style="{
            left: `${getSegmentPosition(segment)}%`,
            width: `${getSegmentWidth(segment)}%`,
            backgroundColor: segment.color
          }"
          :title="`${segment.player}: Race ${segment.start + 1} to ${segment.end + 1}`"
        >
          <span v-if="getSegmentWidth(segment) > 10" class="truncate px-2">
            {{ segment.player }}
          </span>
        </div>
        
        <!-- Leadership change markers -->
        <div
          v-for="(change, index) in leadershipChanges"
          :key="`change-${index}`"
          class="absolute top-0 bottom-0 w-0.5 bg-white/50"
          :style="{ left: `${change.position}%` }"
        ></div>
      </div>
      
      <!-- Leadership change labels -->
      <div class="relative h-8 -mt-2">
        <div
          v-for="(change, index) in leadershipChanges"
          :key="`label-${index}`"
          class="absolute transform -translate-x-1/2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 whitespace-nowrap shadow-sm"
          :style="{ left: `${change.position}%` }"
          :title="`After race ${change.raceIndex + 1}`"
        >
          <span class="font-semibold text-green-600 dark:text-green-400">{{ change.newLeader }}</span>
          <span class="text-muted"> overtakes </span>
          <span class="font-semibold text-red-600 dark:text-red-400">{{ change.previousLeader }}</span>
        </div>
      </div>
      
      <!-- Legend -->
      <div class="flex flex-wrap gap-4 text-sm">
        <div
          v-for="segment in leadershipSegments"
          :key="segment.playerId"
          class="flex items-center gap-2"
        >
          <div
            class="w-4 h-4 rounded"
            :style="{ backgroundColor: segment.color }"
          ></div>
          <span class="font-medium">{{ segment.player }}</span>
          <span class="text-muted">
            ({{ segment.end - segment.start + 1 }} race{{ segment.end - segment.start + 1 !== 1 ? 's' : '' }})
          </span>
        </div>
      </div>
      
      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-black/5">
        <div>
          <p class="text-xs text-muted">Total Races</p>
          <p class="text-xl font-semibold">{{ totalRaces }}</p>
        </div>
        <div>
          <p class="text-xs text-muted">Current Leader</p>
          <p class="text-xl font-semibold truncate">
            {{ leadershipHistory[leadershipHistory.length - 1]?.playerName ?? '—' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted">Leadership Changes</p>
          <p class="text-xl font-semibold">{{ leadershipSegments.length - 1 }}</p>
        </div>
        <div>
          <p class="text-xs text-muted">Different Leaders</p>
          <p class="text-xl font-semibold">
            {{ new Set(leadershipHistory.map(h => h.playerId)).size }}
          </p>
        </div>
      </div>
    </div>
    
    <div v-else class="text-sm text-muted text-center py-8">
      No races yet. Add races to see leadership history.
    </div>
  </div>
</template>
