<script setup lang="ts">
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { TRACKS } from '@/utils/defaults'

const emit = defineEmits<{
  close: []
  selected: [track: string]
}>()

const isSpinning = ref(false)
const rotation = ref(0)
const selectedTrack = ref<string | null>(null)
const showWinner = ref(false)

// Calculate angle per track
const anglePerTrack = 360 / TRACKS.length

// Generate track colors
const trackColors = TRACKS.map((_, index) => {
  const hue = (index * 360) / TRACKS.length
  return `hsl(${hue}, 70%, 60%)`
})

const getSegmentPath = (index: number): string => {
  const centerX = 100
  const centerY = 100
  const radius = 85
  const startAngle = (index * anglePerTrack - 90) * (Math.PI / 180)
  const endAngle = ((index + 1) * anglePerTrack - 90) * (Math.PI / 180)
  
  const x1 = centerX + radius * Math.cos(startAngle)
  const y1 = centerY + radius * Math.sin(startAngle)
  const x2 = centerX + radius * Math.cos(endAngle)
  const y2 = centerY + radius * Math.sin(endAngle)
  
  return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
}

const getTextTransform = (index: number): string => {
  const centerX = 100
  const centerY = 100
  const textRadius = 68
  const angle = (index + 0.5) * anglePerTrack - 90
  const angleRad = angle * (Math.PI / 180)
  
  const x = centerX + textRadius * Math.cos(angleRad)
  const y = centerY + textRadius * Math.sin(angleRad)
  
  // Rotate text to point outward from center (radial)
  return `translate(${x}, ${y}) rotate(${angle})`
}

// Shorten track names for better fit
const shortenTrackName = (track: string): string => {
  const abbreviations: Record<string, string> = {
    'Acorn Heights': 'Acorn',
    'Airship Fortress': 'Airship',
    'Boo Cinema': 'Boo',
    "Bowser's Castle": 'Bowser',
    'Cheep Cheep Falls': 'Cheep',
    'Choco Mountain': 'Choco',
    'Crown City': 'Crown',
    'Dandelion Depths': 'Dandelion',
    'Desert Hills': 'Desert',
    'Dino Dino Jungle': 'Dino',
    'DK Pass': 'DK Pass',
    'DK Spaceport': 'DK Space',
    'Dry Bones Burnout': 'Dry Bones',
    'Faraway Oasis': 'Faraway',
    'Great ? Block Ruins': 'Block',
    'Koopa Troopa Beach': 'Koopa',
    'Mario Bros. Circuit': 'Bros',
    'Mario Circuit': 'Mario',
    'Moo Moo Meadows': 'Moo Moo',
    'Peach Beach': 'P Beach',
    'Peach Stadium': 'P Stadium',
    'Rainbow Road': 'Rainbow',
    'Salty Salty Speedway': 'Salty',
    'Shy Guy Bazaar': 'Shy Guy',
    'Sky-High Sundae': 'Sundae',
    'Starview Peak': 'Starview',
    "Toad's Factory": 'Toad',
    'Wario Stadium': 'W Stadium',
    "Wario's Galleon": 'Galleon',
    'Whistlestop Summit': 'Whistle',
  }
  return abbreviations[track] || track
}

const spinWheel = () => {
  if (isSpinning.value) return
  
  isSpinning.value = true
  selectedTrack.value = null
  showWinner.value = false
  
  // Random spins between 5-8 full rotations plus random angle
  const minSpins = 5
  const maxSpins = 8
  const spins = minSpins + Math.random() * (maxSpins - minSpins)
  const randomAngle = Math.random() * 360
  const totalRotation = spins * 360 + randomAngle
  
  rotation.value += totalRotation
  
  // Calculate which track was selected after 3 seconds
  setTimeout(() => {
    const normalizedRotation = rotation.value % 360
    const selectedIndex = Math.floor(((360 - normalizedRotation) % 360) / anglePerTrack)
    selectedTrack.value = TRACKS[selectedIndex]
    isSpinning.value = false
    showWinner.value = true
    emit('selected', TRACKS[selectedIndex])
  }, 3000)
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    @click="emit('close')"
  >
    <div
      class="bg-white rounded-lg p-6 sm:p-8 w-full max-w-[580px] max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden relative"
      @click.stop
    >
      <!-- Close button -->
      <button
        @click="emit('close')"
        class="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded transition-colors"
      >
        <X :size="24" />
      </button>

      <h2 class="text-2xl font-bold mb-6 text-center">🎯 Spin for a Map!</h2>

      <!-- Wheel Container -->
      <div class="relative mx-auto flex items-center justify-center" style="width: min(78vw, 60vh, 500px); height: min(78vw, 60vh, 500px);">
        <!-- Pointer arrow at top -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div class="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-red-600"></div>
        </div>

        <!-- Wheel -->
        <div class="relative w-full h-full">
          <svg
            viewBox="0 0 200 200"
            class="w-full h-full transition-transform duration-[3000ms] ease-out"
            :style="{ transform: `rotate(${rotation}deg)` }"
          >
            <!-- Draw each track segment -->
            <g v-for="(track, index) in TRACKS" :key="track">
              <path
                :d="getSegmentPath(index)"
                :fill="trackColors[index]"
                stroke="white"
                stroke-width="1.5"
              />
              <!-- Track name text -->
              <text
                :transform="getTextTransform(index)"
                text-anchor="middle"
                dominant-baseline="middle"
                font-size="5.5"
                font-weight="600"
                fill="white"
                stroke="rgba(0,0,0,0.6)"
                stroke-width="0.2"
                paint-order="stroke"
                class="select-none pointer-events-none"
              >
                {{ shortenTrackName(track) }}
              </text>
            </g>
            
            <!-- Center circle -->
            <circle cx="100" cy="100" r="18" fill="white" stroke="#333" stroke-width="2" />
            <circle cx="100" cy="100" r="12" fill="#333" />
          </svg>
        </div>
      </div>

      <!-- Spin Button and Winner Display -->
      <div class="mt-6 text-center">
        <div v-if="showWinner && selectedTrack" class="mb-4">
          <div class="text-4xl mb-2"></div>
          <div class="text-2xl font-bold text-purple-600 mb-4 break-words leading-tight px-2">{{ selectedTrack }}</div>
        </div>
        <button
          @click="spinWheel"
          :disabled="isSpinning"
          class="btn text-lg px-8 py-3"
          :class="[showWinner ? 'btn-ghost' : 'btn-primary', { 'opacity-50 cursor-not-allowed': isSpinning }]"
        >
          {{ isSpinning ? '🎡 Spinning...' : showWinner ? 'Spin Again' : '🎡 Spin the Wheel!' }}
        </button>
      </div>
    </div>
  </div>
</template>
