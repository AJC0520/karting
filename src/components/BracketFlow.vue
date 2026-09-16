<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import type { PlayerColor } from '@/utils/playerColors'

interface BracketRace {
  id: string
  round: string
  slot: number
  players: string[]
  placements: string[]
  completed: boolean
  joker_mimics?: Record<string, string>
}

interface Edge {
  key: string
  playerId: string
  d: string
  color: string
  x2: number
  y2: number
}

interface Stub {
  key: string
  playerId: string
  x: number
  y: number
  color: string
}

const props = defineProps<{
  races: BracketRace[]
  bracketOverview: Record<string, Array<BracketRace | null>>
  playerColors: Record<string, PlayerColor>
  focusedPlayerId: string | null
  /** True when finishing in `position` in `round` knocks the player out. */
  isElimination: (round: string, position: number) => boolean
  /** Bumped by the parent whenever race data changes, to trigger a re-measure. */
  revision: number
}>()

/**
 * The bracket drawn as a flow chart: the winner bracket runs along the top
 * lane, the loser bracket along the bottom, and both converge on the grand
 * finale at the right.
 */
const LANES = [
  { id: 'winner', label: 'Winner bracket' },
  { id: 'loser', label: 'Loser bracket' },
] as const

interface RoundPlacement {
  round: string
  column: number
  lane: 'winner' | 'loser' | 'both'
}

const LAYOUT: RoundPlacement[] = [
  { round: 'Winner bracket 1', column: 0, lane: 'both' },
  { round: 'Winner bracket 2', column: 1, lane: 'winner' },
  { round: 'Loser bracket 1', column: 1, lane: 'loser' },
  { round: 'Winner bracket finale', column: 2, lane: 'winner' },
  { round: 'Loser bracket 2', column: 2, lane: 'loser' },
  { round: 'Qual finale', column: 3, lane: 'loser' },
  // Consolation only decides 5th-8th, so it parks beside the grand finale
  // rather than widening the loser lane.
  { round: 'Grand finale', column: 4, lane: 'both' },
  { round: 'Consolation', column: 4, lane: 'both' },
]

const COLUMN_COUNT = 5

const ROUND_ORDER = [
  'Winner bracket 1',
  'Loser bracket 1',
  'Winner bracket 2',
  'Loser bracket 2',
  'Winner bracket finale',
  'Qual finale',
  'Consolation',
  'Grand finale',
]

const columns = computed(() =>
  Array.from({ length: COLUMN_COUNT }, (_, column) => ({
    column,
    winner: LAYOUT.filter(r => r.column === column && r.lane === 'winner'),
    loser: LAYOUT.filter(r => r.column === column && r.lane === 'loser'),
    both: LAYOUT.filter(r => r.column === column && r.lane === 'both'),
  })),
)

const canvas = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const size = ref({ width: 0, height: 0 })

/**
 * The bracket is laid out at its natural size and then scaled down as a whole
 * so the full width fits the screen. Layout is untouched - this is purely a
 * visual zoom - so connector geometry keeps working in unscaled coordinates.
 *
 * The zoom is written straight to the DOM rather than held in reactive state:
 * it updates on every frame while the editor panel animates open, and routing
 * that through Vue's render cycle from inside a ResizeObserver callback caused
 * an extra style/layout pass per frame (visible as jitter).
 */
const spacer = ref<HTMLElement | null>(null)
let currentScale = 1

/** Below this the text stops being readable, so fall back to scrolling. */
const MIN_SCALE = 0.4
const edges = ref<Edge[]>([])
const stubs = ref<Stub[]>([])

const raceSortKey = (race: BracketRace) => ROUND_ORDER.indexOf(race.round) * 100 + race.slot

/** Ordered list of races each player appears in - one connector per hop. */
const playerJourneys = computed(() => {
  const byPlayer = new Map<string, BracketRace[]>()
  for (const race of props.races) {
    for (const playerId of race.players) {
      const list = byPlayer.get(playerId)
      if (list) list.push(race)
      else byPlayer.set(playerId, [race])
    }
  }
  for (const list of byPlayer.values()) {
    list.sort((a, b) => raceSortKey(a) - raceSortKey(b))
  }
  return byPlayer
})

interface Anchor {
  left: number
  right: number
  y: number
}

/**
 * Recompute the zoom only - the anchors live in unscaled coordinates, so a
 * container resize never needs the expensive anchor pass.
 */
const applyFit = () => {
  fitHandle = 0
  const root = canvas.value
  const view = viewport.value
  if (!root || !view) return

  const naturalWidth = size.value.width || root.scrollWidth
  const naturalHeight = size.value.height || root.scrollHeight
  const available = view.clientWidth
  if (!naturalWidth || !available) return

  currentScale =
    naturalWidth > available ? Math.max(MIN_SCALE, available / naturalWidth) : 1

  root.style.transform = currentScale === 1 ? '' : `scale(${currentScale})`
  if (spacer.value) {
    spacer.value.style.width = `${naturalWidth * currentScale}px`
    spacer.value.style.height = `${naturalHeight * currentScale}px`
  }
}

/** Collapse bursts of resize notifications into one write per frame. */
let fitHandle = 0
const fit = () => {
  if (fitHandle) return
  fitHandle = requestAnimationFrame(applyFit)
}

const measure = () => {
  const root = canvas.value
  if (!root) return

  // scrollWidth/Height are layout values, unaffected by the scale transform.
  const naturalWidth = root.scrollWidth
  const naturalHeight = root.scrollHeight
  size.value = { width: naturalWidth, height: naturalHeight }

  applyFit()

  const rootRect = root.getBoundingClientRect()
  // getBoundingClientRect returns post-transform pixels, so divide through by
  // the scale currently painted to get back to the SVG's coordinate system.
  const painted = naturalWidth > 0 ? rootRect.width / naturalWidth : 1
  const k = painted > 0 ? painted : 1

  const anchors = new Map<string, Anchor>()
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-anchor]'))) {
    const key = el.dataset.anchor
    if (!key) continue
    const rect = el.getBoundingClientRect()
    // Lines leave and enter at the card's edge, at the height of the player's
    // row - starting them at the row edge would hide them under the card.
    const card = (el.closest('[data-race-card]') ?? el).getBoundingClientRect()
    anchors.set(key, {
      left: (card.left - rootRect.left) / k,
      right: (card.right - rootRect.left) / k,
      y: (rect.top - rootRect.top + rect.height / 2) / k,
    })
  }

  const nextEdges: Edge[] = []
  const nextStubs: Stub[] = []

  for (const [playerId, journey] of playerJourneys.value) {
    const color = props.playerColors[playerId]?.hex ?? '#94A3B8'

    for (let i = 0; i < journey.length - 1; i++) {
      const from = anchors.get(`${journey[i].id}|${playerId}`)
      const to = anchors.get(`${journey[i + 1].id}|${playerId}`)
      if (!from || !to) continue

      const x1 = from.right
      const y1 = from.y
      const x2 = to.left
      const y2 = to.y
      const dx = Math.max(32, Math.abs(x2 - x1) * 0.45)

      nextEdges.push({
        key: `${journey[i].id}->${journey[i + 1].id}|${playerId}`,
        playerId,
        color,
        x2,
        y2,
        d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
      })
    }

    // A player whose final race knocked them out gets a short dead-end stub.
    const last = journey[journey.length - 1]
    if (!last || !last.completed) continue
    const position = last.placements.indexOf(playerId) + 1
    if (position === 0 || !props.isElimination(last.round, position)) continue

    const anchor = anchors.get(`${last.id}|${playerId}`)
    if (!anchor) continue
    nextStubs.push({
      key: `stub_${last.id}_${playerId}`,
      playerId,
      color,
      x: anchor.right,
      y: anchor.y,
    })
  }

  edges.value = nextEdges
  stubs.value = nextStubs
}

const scheduleMeasure = () => {
  nextTick(() => requestAnimationFrame(measure))
}

const orderedEdges = computed(() => {
  if (!props.focusedPlayerId) return edges.value
  // Draw the focused player's path last so it sits on top of everything else.
  return [
    ...edges.value.filter(e => e.playerId !== props.focusedPlayerId),
    ...edges.value.filter(e => e.playerId === props.focusedPlayerId),
  ]
})

// Lines stay hidden until a player is hovered/pinned; only their path draws.
const isDimmed = (playerId: string) => props.focusedPlayerId !== playerId

let observer: ResizeObserver | null = null
let viewportObserver: ResizeObserver | null = null

onMounted(() => {
  scheduleMeasure()
  if (typeof ResizeObserver !== 'undefined') {
    if (canvas.value) {
      observer = new ResizeObserver(() => measure())
      observer.observe(canvas.value)
    }
    // The viewport narrows while the editor panel animates open - just rescale.
    viewportObserver = new ResizeObserver(() => fit())
    if (viewport.value) viewportObserver.observe(viewport.value)
  }
  window.addEventListener('resize', measure)
  document.fonts?.ready.then(measure).catch(() => {})
})

onBeforeUnmount(() => {
  if (fitHandle) cancelAnimationFrame(fitHandle)
  observer?.disconnect()
  viewportObserver?.disconnect()
  window.removeEventListener('resize', measure)
})

watch(() => [props.revision, props.races.length], scheduleMeasure)

defineExpose({ measure: scheduleMeasure })
</script>

<template>
  <div class="pb-4">
    <div ref="viewport" class="overflow-x-auto">
    <div ref="spacer">
    <div ref="canvas" class="bracket-canvas relative w-max origin-top-left">
      <!-- Connector layer: behind the cards, so lines only show in the gaps -->
      <svg
        class="pointer-events-none absolute inset-0 z-0"
        :width="size.width"
        :height="size.height"
        :viewBox="`0 0 ${size.width} ${size.height}`"
        aria-hidden="true"
      >
        <g v-for="edge in orderedEdges" :key="edge.key">
          <path
            :d="edge.d"
            fill="none"
            :stroke="edge.color"
            :stroke-width="focusedPlayerId === edge.playerId ? 3.5 : 1.75"
            stroke-linecap="round"
            class="flow-edge"
            :class="{
              'flow-edge--dim': isDimmed(edge.playerId),
              'flow-edge--live': focusedPlayerId === edge.playerId,
            }"
          />
          <circle
            :cx="edge.x2"
            :cy="edge.y2"
            :r="focusedPlayerId === edge.playerId ? 4.5 : 3"
            :fill="edge.color"
            class="flow-edge"
            :class="{ 'flow-edge--dim': isDimmed(edge.playerId) }"
          />
        </g>

        <g
          v-for="stub in stubs"
          :key="stub.key"
          class="flow-edge"
          :class="{ 'flow-edge--dim': isDimmed(stub.playerId) }"
        >
          <path
            :d="`M ${stub.x} ${stub.y} h 14`"
            fill="none"
            :stroke="stub.color"
            stroke-width="2"
            stroke-linecap="round"
            stroke-dasharray="3 3"
          />
          <path
            :d="`M ${stub.x + 19} ${stub.y - 4} l 8 8 M ${stub.x + 27} ${stub.y - 4} l -8 8`"
            fill="none"
            :stroke="stub.color"
            stroke-width="2"
            stroke-linecap="round"
          />
        </g>
      </svg>

      <div class="relative z-10 grid auto-cols-max grid-flow-col grid-rows-[auto_auto] gap-x-16 gap-y-6">
        <template v-for="col in columns" :key="col.column">
          <!-- Rounds that span both lanes (opening round, grand finale) -->
          <div v-if="col.both.length" class="row-span-2 flex flex-col justify-center gap-5 py-4">
            <div v-for="entry in col.both" :key="entry.round">
              <slot name="round" :round="entry.round" :races="bracketOverview[entry.round] || []" />
            </div>
          </div>

          <template v-else>
            <div class="flex flex-col gap-5 py-4">
              <div v-for="entry in col.winner" :key="entry.round">
                <slot name="round" :round="entry.round" :races="bracketOverview[entry.round] || []" />
              </div>
            </div>
            <div class="flex flex-col gap-5 py-4">
              <div v-for="entry in col.loser" :key="entry.round">
                <slot name="round" :round="entry.round" :races="bracketOverview[entry.round] || []" />
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

    </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span
        v-for="lane in LANES"
        :key="lane.id"
        class="mk-flag"
        :class="lane.id === 'winner'
          ? 'bg-green-400 text-green-950'
          : 'bg-red-400 text-red-950'"
      >
        {{ lane.label }}
      </span>
      <span class="mk-flag border-dashed bg-white text-ink">
        Hover a driver to trace their path
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Own compositor layer: the canvas is rescaled on every frame while the editor
   panel opens, and without this the whole bracket re-rasterises each time. */
.bracket-canvas {
  will-change: transform;
}

.flow-edge {
  transition: opacity 180ms ease;
  opacity: 1;
}

.flow-edge--dim {
  opacity: 0;
}

.flow-edge--live {
  opacity: 1;
  stroke-dasharray: 10 6;
  animation: flow-dash 1.1s linear infinite;
}

@keyframes flow-dash {
  to {
    stroke-dashoffset: -16;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-edge--live {
    animation: none;
    stroke-dasharray: none;
  }
}
</style>
