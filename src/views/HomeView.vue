<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAppStore } from '@/stores/appStore'
import { formatDate } from '@/utils/format'

const store = useAppStore()
const router = useRouter()
const newName = ref('')

const tournaments = computed(() => store.tournaments)

const createTournament = async () => {
  if (!newName.value.trim()) return
  const id = await store.createTournament(newName.value)
  newName.value = ''
  if (id) {
    router.push(`/t/${id}/leaderboard`)
  }
}
</script>

<template>
  <section class="space-y-8">
    <div class="card p-6">
      <h2 class="text-2xl font-semibold">Ready for the next season?</h2>
      <p class="mt-2 text-sm text-muted">
        Create a tournament, add your players, and keep track of every race across months of sessions.
      </p>
      <form class="mt-4 flex flex-wrap gap-3" @submit.prevent="createTournament">
        <input v-model="newName" class="input w-64" placeholder="Tournament name" />
        <button class="btn btn-primary" type="submit">Create tournament</button>
      </form>
    </div>

    <div>
      <h3 class="section-title">Recent tournaments</h3>
      <p class="subtle">Jump back into leaderboards, players, or race history.</p>
    </div>

    <div v-if="!tournaments.length" class="card p-6 text-sm text-muted">
      No tournaments yet. Create one to start tracking results.
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div 
        v-for="tournament in tournaments" 
        :key="tournament.id" 
        class="card p-5 cursor-pointer hover:shadow-lg transition-shadow"
        @click="router.push(`/t/${tournament.id}/leaderboard`)"
      >
        <h4 class="text-lg font-semibold">{{ tournament.name }}</h4>
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
