<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Trophy, Calendar, ArrowLeft } from 'lucide-vue-next'
import { useBracketStore, type BracketPlayer } from '@/stores/bracketStore'
import BracketPodium from '@/components/BracketPodium.vue'
import BracketLeaderboard from '@/components/BracketLeaderboard.vue'
import BracketRaceCard from '@/components/BracketRaceCard.vue'
import BracketFlow from '@/components/BracketFlow.vue'
import PlayerScoreBreakdown from '@/components/PlayerScoreBreakdown.vue'
import { buildPlayerColors } from '@/utils/playerColors'
import { getPositionColor, isElimination } from '@/utils/bracketDisplay'
import { computeBracketStandings } from '@/utils/bracketScoring'

const bracketStore = useBracketStore()

interface BracketRace {
  id: string
  round: string
  slot: number
  players: string[]
  placements: string[]
  completed: boolean
  joker_mimics?: Record<string, string>
}

const ROUNDS = [
  'Winner bracket 1',
  'Winner bracket 2',
  'Winner bracket finale',
  'Grand finale',
  'Loser bracket 1',
  'Loser bracket 2',
  'Qual finale',
  'Consolation',
]
const winnerRounds = ['Winner bracket 1', 'Winner bracket 2', 'Winner bracket finale', 'Grand finale']

/** A tournament still being played won't have every round's races yet - this
 *  fills the bracket shape with TBD placeholders so it reads the same way
 *  the host's own live view does. */
const getExpectedRaceCount = (round: string): number => {
  switch (round) {
    case 'Winner bracket 1':
      return races.value.filter(r => r.round === 'Winner bracket 1').length
    case 'Winner bracket 2':
    case 'Loser bracket 1':
    case 'Loser bracket 2':
      return 2
    default:
      return 1
  }
}

const selectedTournamentId = ref<string | null>(null)
const players = ref<BracketPlayer[]>([])
const races = ref<BracketRace[]>([])
const focusedPlayerId = ref<string | null>(null)
const mousePos = ref({ x: 0, y: 0 })
const now = ref(new Date())

/** How often to re-pull data while a party is actually watching a page -
 *  cheap enough not to matter, frequent enough to feel live. */
const POLL_MS = 8000
let listPoll: number | null = null
let detailPoll: number | null = null
let clockTick: number | null = null

onMounted(() => {
  bracketStore.fetchPublicTournaments()
  listPoll = window.setInterval(() => {
    // Only refresh the list in the background while it's what's on screen -
    // once a tournament is open its own poll takes over.
    if (!selectedTournamentId.value) bracketStore.fetchPublicTournaments()
  }, POLL_MS)
  // Ticks the countdowns - separate from the data poll, which only needs to
  // run every few seconds.
  clockTick = window.setInterval(() => { now.value = new Date() }, 1000)
})

onBeforeUnmount(() => {
  if (listPoll) window.clearInterval(listPoll)
  if (detailPoll) window.clearInterval(detailPoll)
  if (clockTick) window.clearInterval(clockTick)
})

interface TournamentLike {
  completed: boolean
  started: boolean
  event_date: string | null
  created_at: string
}

const eventDateOf = (t: TournamentLike) => new Date(t.event_date ?? t.created_at)

const formatCountdown = (target: Date): string => {
  const totalMinutes = Math.floor((target.getTime() - now.value.getTime()) / 60000)
  if (totalMinutes <= 0) return 'Starting now'
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `Starts in ${days}d ${hours}h`
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`
  return `Starts in ${minutes}m`
}

/**
 * draft = roster-only, not started yet - still gets a countdown to its
 * event_date, or "Starting soon" once that time has passed, so a host who
 * created it ahead of time but hasn't finished the roster still shows up.
 * live = actually started, past its scheduled time and not completed - the
 * state /online exists to show off, so it gets the flashy red treatment.
 * scheduled = started but hasn't reached its event_date yet.
 */
const statusOf = (
  t: TournamentLike,
): { kind: 'finished' | 'scheduled' | 'live' | 'draft'; label: string } => {
  if (t.completed) return { kind: 'finished', label: 'Finished' }
  const eventDate = eventDateOf(t)
  const upcoming = eventDate.getTime() > now.value.getTime()
  if (!t.started) {
    return { kind: 'draft', label: upcoming ? formatCountdown(eventDate) : 'Starting soon' }
  }
  if (upcoming) return { kind: 'scheduled', label: formatCountdown(eventDate) }
  return { kind: 'live', label: 'Live now' }
}

/** Drafts are the "coming up" announcement - shown bigger and styled like a
 *  live tournament even before it has a bracket, so it reads as the thing to
 *  watch for rather than just another list row. */
const draftTournaments = computed(() => bracketStore.publicTournaments.filter(t => !t.started))
const openTournaments = computed(() => bracketStore.publicTournaments.filter(t => t.started))

const selectedTournament = computed(() =>
  bracketStore.publicTournaments.find(t => t.id === selectedTournamentId.value) ?? null,
)
const selectedStatus = computed(() => (selectedTournament.value ? statusOf(selectedTournament.value) : null))

const updateMousePos = (event: MouseEvent) => {
  mousePos.value = { x: event.clientX, y: event.clientY }
}

const playerColors = computed(() => buildPlayerColors(players.value))
const getPlayerById = (id: string) => players.value.find(p => p.id === id)

const bracketOverview = computed(() => {
  const result: Record<string, Array<BracketRace | null>> = {}
  for (const round of ROUNDS) {
    const existing = races.value.filter(r => r.round === round).sort((a, b) => a.slot - b.slot)
    const expected = getExpectedRaceCount(round)
    const slots: Array<BracketRace | null> = []
    for (let slot = 0; slot < expected; slot++) {
      slots.push(existing.find(r => r.slot === slot) ?? null)
    }
    result[round] = slots
  }
  return result
})

const getRaceRows = (race: BracketRace | null) => {
  if (!race) {
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

/** Every race - Grand finale and the slower-to-get-to Consolation alike -
 *  actually played. The reveal (podium, standings, score breakdowns) waits
 *  for this rather than just the Grand finale. */
const tournamentFinished = computed(() => races.value.length > 0 && races.value.every(r => r.completed))

const grandFinaleResult = computed(() => {
  const race = bracketOverview.value['Grand finale']?.[0]
  if (race && race.completed && race.placements.length) {
    return race.placements.map((playerId, index) => ({
      placement: index + 1,
      player: getPlayerById(playerId),
    }))
  }
  return null
})

const bracketStandings = computed(() => {
  if (!tournamentFinished.value) return []
  return computeBracketStandings(races.value, players.value.map(p => p.id))
})

const focusedStanding = computed(() => {
  if (!tournamentFinished.value || !focusedPlayerId.value) return null
  return bracketStandings.value.find(s => s.playerId === focusedPlayerId.value) ?? null
})

const loadTournamentData = async (tournamentId: string) => {
  const rows = await bracketStore.fetchPublicRaces(tournamentId)
  races.value = rows.map(r => ({
    id: r.id,
    round: r.round,
    slot: r.race_number,
    players: r.players as string[],
    placements: (r.placements as string[]) || [],
    completed: r.completed,
  }))

  // The roster (including any jokers added mid-tournament) can change while
  // it's being played, so re-read it from the tournament row each poll too.
  const tournament = bracketStore.publicTournaments.find(t => t.id === tournamentId)
  if (tournament) players.value = tournament.players as BracketPlayer[]
}

const openTournament = async (tournamentId: string) => {
  const tournament = bracketStore.publicTournaments.find(t => t.id === tournamentId)
  if (!tournament) return

  players.value = tournament.players as BracketPlayer[]
  selectedTournamentId.value = tournamentId
  await loadTournamentData(tournamentId)

  if (detailPoll) window.clearInterval(detailPoll)
  detailPoll = window.setInterval(async () => {
    if (!selectedTournamentId.value) return
    // Once every race is in, the bracket can no longer change - stop polling.
    if (tournamentFinished.value) return
    await bracketStore.fetchPublicTournaments()
    await loadTournamentData(selectedTournamentId.value)
  }, POLL_MS)
}

const backToList = () => {
  if (detailPoll) {
    window.clearInterval(detailPoll)
    detailPoll = null
  }
  selectedTournamentId.value = null
  focusedPlayerId.value = null
  races.value = []
  players.value = []
  bracketStore.fetchPublicTournaments()
}
</script>

<template>
  <div class="content-area mx-auto max-w-6xl">
    <h1 class="mb-8 text-center font-mk text-3xl uppercase tracking-wide text-ink sm:text-5xl">
      Trikom Beeriokart Resultater
    </h1>

    <!-- Tournament list -->
    <div v-if="!selectedTournamentId" class="space-y-3">
      <div v-if="bracketStore.publicLoading && bracketStore.publicTournaments.length === 0" class="text-center py-8 text-muted">
        Loading tournaments...
      </div>

      <div v-else-if="bracketStore.publicTournaments.length === 0" class="text-center py-12">
        <Trophy :size="48" class="mx-auto mb-4 text-muted opacity-50" />
        <p class="text-muted">No tournaments yet.</p>
      </div>

      <!-- Drafts still counting down look exactly like the rest of the list -
           only once one is actually overdue (past its own start time and
           still not started) does it stand out with the bigger, flashy
           treatment, since that's the one that actually needs attention. -->
      <div
        v-for="tournament in draftTournaments"
        :key="tournament.id"
        class="mk-panel-sm block w-full text-left"
        :class="statusOf(tournament).label === 'Starting soon' ? 'mk-live-outline p-6 sm:p-8' : 'p-4'"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3
              class="font-mk uppercase tracking-wide text-ink"
              :class="statusOf(tournament).label === 'Starting soon' ? 'text-2xl sm:text-3xl' : 'text-lg'"
            >
              {{ tournament.name }}
            </h3>
            <div class="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted">
              <span class="flex items-center gap-1">
                <Calendar :size="14" />
                {{ eventDateOf(tournament).toLocaleString() }}
              </span>
            </div>
          </div>
          <span
            class="mk-flag mk-flag-lg"
            :class="statusOf(tournament).label === 'Starting soon' ? 'mk-flag-live' : 'mk-flag-ready'"
          >
            {{ statusOf(tournament).label }}
          </span>
        </div>
      </div>

      <button
        v-for="tournament in openTournaments"
        :key="tournament.id"
        class="mk-panel-sm block w-full p-4 text-left transition-transform hover:-translate-y-0.5"
        :class="statusOf(tournament).kind === 'live' ? 'mk-live-outline' : ''"
        @click="openTournament(tournament.id)"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="font-mk text-lg uppercase tracking-wide text-ink">{{ tournament.name }}</h3>
            <div class="mt-1 flex items-center gap-4 text-sm text-muted">
              <span class="flex items-center gap-1">
                <Calendar :size="14" />
                {{ eventDateOf(tournament).toLocaleString() }}
              </span>
              <span>{{ (tournament.players as any[]).length }} players</span>
            </div>
          </div>
          <span
            class="mk-flag mk-flag-lg"
            :class="{
              'mk-flag-done': statusOf(tournament).kind === 'finished',
              'mk-flag-live': statusOf(tournament).kind === 'live',
              'mk-flag-ready': statusOf(tournament).kind === 'scheduled',
            }"
          >
            {{ statusOf(tournament).label }}
          </span>
        </div>
      </button>
    </div>

    <!-- Tournament detail -->
    <div v-else class="space-y-6" @mousemove="updateMousePos">
      <button class="btn btn-ghost" @click="backToList">
        <ArrowLeft :size="16" />
        All tournaments
      </button>

      <div class="flex items-center justify-between gap-3">
        <h2 class="font-mk text-2xl uppercase tracking-wide text-ink sm:text-3xl">
          {{ selectedTournament?.name }}
        </h2>
      </div>

      <div v-if="grandFinaleResult && tournamentFinished" class="space-y-6">
        <div class="card p-6">
          <BracketPodium :results="grandFinaleResult" />
        </div>
        <BracketLeaderboard
          :standings="bracketStandings"
          :get-player-name="(id: string) => getPlayerById(id)?.name ?? '-'"
          :player-colors="playerColors"
        />
      </div>

      <div class="card p-6 space-y-6" :class="selectedStatus?.kind === 'live' ? 'mk-live-outline' : ''">
        <div class="flex items-center justify-between gap-3">
          <h2 class="section-title">Tournament bracket</h2>
          <span
            v-if="selectedStatus && selectedStatus.kind !== 'finished'"
            class="mk-flag mk-flag-lg"
            :class="selectedStatus.kind === 'live' ? 'mk-flag-live' : 'mk-flag-ready'"
          >
            {{ selectedStatus.label }}
          </span>
        </div>
        <BracketFlow
          :races="races"
          :bracket-overview="bracketOverview"
          :player-colors="playerColors"
          :focused-player-id="focusedPlayerId"
          :is-elimination="isElimination"
          :revision="races.length"
        >
          <template #round="{ round, races: roundRaces }">
            <section class="mk-panel overflow-hidden">
              <div
                class="mk-plate flex items-center gap-2"
                :class="round === 'Grand finale'
                  ? 'mk-plate-gold'
                  : winnerRounds.includes(round)
                  ? 'mk-plate-green'
                  : 'mk-plate-red'"
              >
                <span>{{ round }}</span>
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
                  :is-active="false"
                  :get-player-by-id="getPlayerById"
                  :get-position-color="getPositionColor"
                  :get-race-rows="() => getRaceRows(race)"
                  :player-colors="playerColors"
                  :focused-player-id="focusedPlayerId"
                  :is-locked="true"
                  @focus-player="(id) => (focusedPlayerId = id)"
                />
              </div>
            </section>
          </template>
        </BracketFlow>
      </div>

      <div
        v-if="focusedStanding"
        class="pointer-events-none fixed z-50"
        :style="{ left: `${mousePos.x + 18}px`, top: `${mousePos.y + 18}px` }"
      >
        <PlayerScoreBreakdown
          :player-name="getPlayerById(focusedStanding.playerId)?.name ?? '-'"
          :player-color="playerColors[focusedStanding.playerId]"
          :placement="focusedStanding.placement"
          :total-points="focusedStanding.totalPoints"
          :races="focusedStanding.races"
        />
      </div>
    </div>
  </div>
</template>
