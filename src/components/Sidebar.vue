<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'

const store = useAppStore()
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const newName = ref('')
const editingId = ref<string | null>(null)
const editingName = ref('')

const tournaments = computed(() => store.tournaments)
const activeId = computed(() => route.params.id as string | undefined)

const createTournament = async () => {
  if (!newName.value.trim()) return
  const id = await store.createTournament(newName.value)
  newName.value = ''
  if (id) {
    router.push(`/t/${id}/leaderboard`)
  }
}

const startRename = (id: string, name: string) => {
  editingId.value = id
  editingName.value = name
}

const saveRename = async () => {
  if (!editingId.value) return
  await store.renameTournament(editingId.value, editingName.value)
  editingId.value = null
  editingName.value = ''
}

const cancelRename = () => {
  editingId.value = null
  editingName.value = ''
}

const removeTournament = async (id: string, name: string) => {
  if (!confirm(`Delete "${name}"? This removes all players and races.`)) return
  await store.deleteTournament(id)
  if (activeId.value === id) {
    router.push('/')
  }
}

const handleLogout = async () => {
  try {
    await authStore.signOut()
    router.push('/login')
  } catch (error) {
    console.error('Failed to sign out:', error)
  }
}
</script>

<template>
  <aside class="w-full border-b border-black/5 bg-surface/95 p-4 lg:w-72 lg:border-b-0 lg:border-r">
    <div class="mb-6">
      <p class="text-xs uppercase tracking-[0.3em] text-muted">Mario Kart</p>
      <h1 class="text-2xl font-semibold">Tournament Tracker</h1>
      <div v-if="authStore.userEmail" class="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{{ authStore.userEmail }}</span>
        <button @click="handleLogout" class="text-xs font-semibold hover:text-red-600">
          Logout
        </button>
      </div>
    </div>

    <form class="mb-6 space-y-3" @submit.prevent="createTournament">
      <input v-model="newName" class="input" placeholder="New tournament name" />
      <button class="btn btn-primary w-full" type="submit">Create tournament</button>
    </form>

    <div class="mb-4 flex items-center justify-between">
      <h2 class="section-title">Tournaments</h2>
      <RouterLink class="btn btn-ghost text-xs" to="/">Home</RouterLink>
    </div>

    <div v-if="!tournaments.length" class="subtle">
      Add your first tournament to start tracking races.
    </div>

    <div class="space-y-3">
      <div
        v-for="tournament in tournaments"
        :key="tournament.id"
        class="card px-4 py-3 cursor-pointer hover:shadow-md transition-shadow"
        :class="activeId === tournament.id ? 'ring-2 ring-primary/40' : ''"
        @click="router.push(`/t/${tournament.id}/leaderboard`)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="font-semibold text-ink">
            {{ tournament.name }}
          </div>
          <div class="flex gap-2" @click.stop>
            <button
              class="text-xs font-semibold text-muted hover:text-primary"
              type="button"
              @click="startRename(tournament.id, tournament.name)"
            >
              Rename
            </button>
            <button
              class="text-xs font-semibold text-muted hover:text-red-600"
              type="button"
              @click="removeTournament(tournament.id, tournament.name)"
            >
              Delete
            </button>
          </div>
        </div>
        <div class="mt-2 flex gap-2 text-xs text-muted">
          <span>{{ tournament.players.length }} players</span>
          <span>•</span>
          <span>{{ tournament.races.length }} races</span>
        </div>

        <div v-if="editingId === tournament.id" class="mt-3 space-y-2" @click.stop>
          <input v-model="editingName" class="input" />
          <div class="flex gap-2">
            <button class="btn btn-primary" type="button" @click="saveRename">Save</button>
            <button class="btn btn-ghost" type="button" @click="cancelRename">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
