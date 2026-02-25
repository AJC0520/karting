<template>
  <div class="relative inline-block max-w-full">
    <img
      ref="mapImage"
      src="/map.png"
      alt="Mario Kart World Track Map"
      class="w-full h-auto"
      @load="onImageLoad"
    />
    
    <svg
      v-if="imageLoaded"
      class="absolute inset-0 w-full h-full pointer-events-none"
      :viewBox="`0 0 ${imageWidth} ${imageHeight}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <g
        v-for="hotspot in trackHotspots"
        :key="hotspot.track"
        class="pointer-events-auto cursor-pointer"
        @mouseenter="showTooltip(hotspot)"
        @mouseleave="hideTooltip"
      >
        <!-- Invisible circle for hover area -->
        <circle
          :cx="hotspot.x"
          :cy="hotspot.y"
          :r="70"
          class="fill-transparent stroke-transparent"
        />
        <text
          :x="hotspot.x"
          :y="hotspot.y"
          class="fill-white text-xs font-bold select-none pointer-events-none"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {{ hotspot.label }}
        </text>
      </g>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="tooltip"
      class="absolute z-[9999] bg-gray-900 text-white p-4 rounded-lg shadow-xl pointer-events-none min-w-[250px]"
      :style="{
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        transform: 'translate(-50%, -110%)',
      }"
    >
      <h3 class="font-bold text-lg mb-2">{{ tooltip.track }}</h3>
      <div v-if="tooltip.stats" class="space-y-1 text-sm">
        <div>
          <span class="text-gray-400">Times Played:</span>
          <span class="ml-2 font-semibold">{{ tooltip.stats.timesPlayed }}</span>
        </div>
        <div v-if="tooltip.stats.mostWins">
          <span class="text-gray-400">Most Wins:</span>
          <span class="ml-2 font-semibold">
            {{ tooltip.stats.mostWins.player.name }} ({{ tooltip.stats.mostWins.wins }})
          </span>
        </div>
        <div v-if="tooltip.stats.mostPoints">
          <span class="text-gray-400">Most Points:</span>
          <span class="ml-2 font-semibold">
            {{ tooltip.stats.mostPoints.player.name }} ({{ tooltip.stats.mostPoints.totalPoints }})
          </span>
        </div>
        <div>
          <span class="text-gray-400">Avg Spread:</span>
          <span class="ml-2 font-semibold">{{ tooltip.stats.avgPointSpread.toFixed(1) }} pts</span>
        </div>
        <div v-if="tooltip.stats.lastPlayed">
          <span class="text-gray-400">Last Played:</span>
          <span class="ml-2 font-semibold">{{ formatDate(tooltip.stats.lastPlayed) }}</span>
        </div>
      </div>
      <div v-else class="text-sm text-gray-400">
        No races played on this track yet
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/appStore'
import { getTrackStats, type TrackStats } from '@/utils/stats'
import { TRACKS } from '@/utils/defaults'

const route = useRoute()
const store = useAppStore()

const tournament = computed(() => {
  const id = route.params.id as string
  return store.getTournamentById(id)
})

const mapImage = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)
const imageWidth = ref(1200)
const imageHeight = ref(800)

const tooltip = ref<{
  x: number
  y: number
  track: string
  stats: TrackStats | null
} | null>(null)

// Track hotspot coordinates (approximate positions based on typical Mario Kart World map layout)
// These will need to be adjusted based on the actual map image
const trackHotspots = computed(() => {
  if (!tournament.value) return []

  const positions: Record<string, { x: number; y: number; label: string }> = {
    'Acorn Heights': { x: 1913, y: 207, label: '1' },
    'Airship Fortress': { x: 971, y: 692, label: '2' },
    'Boo Cinema': { x: 2275, y: 355, label: '3' },
    "Bowser's Castle": { x: 1287, y: 340, label: '4' },
    'Cheep Cheep Falls': { x: 2250, y: 1175, label: '5' },
    'Choco Mountain': { x: 1578, y: 1155, label: '6' },
    'Crown City': { x: 1593, y: 1608, label: '7' },
    'Dandelion Depths': {x: 2235, y: 821, label: '8' },
    'Desert Hills': { x: 896, y: 1573, label: '9' },
    'Dino Dino Jungle': { x: 2314, y: 1971, label: '10' },
    'DK Pass': { x: 2533, y: 976, label: '11' },
    'DK Spaceport': { x: 1627, y: 1896, label: '12' },
    'Dry Bones Burnout': { x: 1599, y: 361, label: '13' },
    'Faraway Oasis': { x: 2225, y: 1543, label: '14' },
    'Great ? Block Ruins': { x: 2643, y: 1822, label: '15' },
    'Koopa Troopa Beach': { x: 1906, y: 1842, label: '16' },
    'Mario Bros. Circuit': { x: 1195, y: 1359, label: '17' },
    'Mario Circuit': { x: 1927, y: 575, label: '18' },
    'Moo Moo Meadows': { x: 1916, y: 926, label: '19' },
    'Peach Beach': { x: 2857, y: 1558, label: '20' },
    'Peach Stadium': { x: 1916, y: 1274, label: '21' },
    'Rainbow Road': { x: 1921, y: 1573, label: '22' },
    'Salty Salty Speedway': { x: 2553, y: 1369, label: '23' },
    'Shy Guy Bazaar': { x: 921, y: 1140, label: '24' },
    'Sky-High Sundae': { x: 2837, y: 762, label: '25' },
    'Starview Peak': { x: 2549, y: 508, label: '26' },
    "Toad's Factory": { x: 1623, y: 762, label: '27' },
    'Wario Stadium': { x: 1264, y: 936, label: '28' },
    "Wario's Galleon": { x: 2887, y: 1205, label: '29' },
    'Whistlestop Summit': { x: 1229, y: 1817, label: '30' },
  }

  return TRACKS.map((track) => {
    const pos = positions[track] || { x: 600, y: 400, label: '?' }
    const stats = getTrackStats(tournament.value!, track)
    
    return {
      track,
      x: pos.x,
      y: pos.y,
      label: pos.label,
      stats,
    }
  })
})

function onImageLoad() {
  if (mapImage.value) {
    imageWidth.value = mapImage.value.naturalWidth
    imageHeight.value = mapImage.value.naturalHeight
    imageLoaded.value = true
  }
}

function showTooltip(hotspot: { track: string; x: number; y: number; stats: TrackStats | null }) {
  if (!mapImage.value) return

  const rect = mapImage.value.getBoundingClientRect()
  const scaleX = rect.width / imageWidth.value
  const scaleY = rect.height / imageHeight.value

  tooltip.value = {
    x: hotspot.x * scaleX,
    y: hotspot.y * scaleY,
    track: hotspot.track,
    stats: hotspot.stats,
  }
}

function hideTooltip() {
  tooltip.value = null
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

onMounted(() => {
  if (mapImage.value?.complete) {
    onImageLoad()
  }
})

onUnmounted(() => {
  hideTooltip()
})
</script>
