<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/appStore'
import { formatDate } from '@/utils/format'

const store = useAppStore()
const router = useRouter()

const tournaments = computed(() => store.tournaments)
</script>

<template>
  <section class="space-y-8">
    <div class="card p-6">
      <h2 class="font-mk text-2xl text-red-700">Ready for the next tournament?</h2>
      <p class="mt-2 text-sm text-muted">
        Create a tournament, add your players, and keep track of every race.
      </p>
      <div class="mt-4">
        <RouterLink to="/create-tournament" class="btn btn-primary">
          + Create Tournament
        </RouterLink>
      </div>
    </div>

    <div>
      <h3 class="section-title text-white">Your Tournaments</h3>
      <p class="subtle">Jump back into leaderboards, players, or race history.</p>
    </div>

    <div v-if="!tournaments.length" class="card p-6 text-sm text-muted">
      No tournaments yet. Create one to start tracking results.
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="tournament in tournaments"
        :key="tournament.id"
        class="card p-5 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-l-4 border-red-500"
        @click="router.push(`/t/${tournament.id}/leaderboard`)"
      >
        <h4 class="font-mk text-lg text-red-700">{{ tournament.name }}</h4>
        <p class="mt-1 text-xs text-muted">Created {{ formatDate(tournament.createdAt) }}</p>
        <div class="mt-3 flex gap-2 text-xs text-muted">
          <span>{{ tournament.players.length }} players</span>
          <span>•</span>
          <span>{{ tournament.races.length }} races</span>
        </div>
        <div class="mt-4 flex flex-wrap gap-2" @click.stop>
          <RouterLink class="btn btn-ghost text-xs" :to="`/t/${tournament.id}/leaderboard`">
            Leaderboard
          </RouterLink>
          <RouterLink class="btn btn-ghost text-xs" :to="`/t/${tournament.id}/races`">
            Races
          </RouterLink>
          <RouterLink class="btn btn-ghost text-xs" :to="`/t/${tournament.id}/players`">
            Players
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
