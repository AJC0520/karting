<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/appStore'
import { createId } from '@/utils/id'

const store = useAppStore()
const router = useRouter()

const tournamentName = ref('')
const newPlayerName = ref('')
const newPlayerNickname = ref('')
const blueShellBonus = ref(false)

type TempPlayer = {
  id: string
  name: string
  nickname?: string
}

const players = ref<TempPlayer[]>([])

const canAddPlayer = computed(() => newPlayerName.value.trim().length > 0)
const canSubmit = computed(() => tournamentName.value.trim().length > 0 && players.value.length > 0)

const addPlayer = () => {
  if (!canAddPlayer.value) return
  
  players.value.push({
    id: createId(),
    name: newPlayerName.value.trim(),
    nickname: newPlayerNickname.value.trim() || undefined,
  })
  
  newPlayerName.value = ''
  newPlayerNickname.value = ''
}

const removePlayer = (id: string) => {
  players.value = players.value.filter(p => p.id !== id)
}

const createTournament = async () => {
  if (!canSubmit.value) return
  
  const tournamentId = await store.createTournament(tournamentName.value.trim(), blueShellBonus.value)
  
  if (tournamentId) {
    // Add all players to the tournament
    for (const player of players.value) {
      await store.addPlayer(tournamentId, {
        name: player.name,
        nickname: player.nickname,
      })
    }
    
    router.push(`/t/${tournamentId}/leaderboard`)
  }
}

const cancel = () => {
  router.push('/')
}
</script>

<template>
  <section class="max-w-4xl mx-auto space-y-8">
    <header>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-muted">Create new</p>
          <h2 class="text-3xl font-semibold">Tournament</h2>
        </div>
        <button @click="cancel" class="btn btn-ghost">Cancel</button>
      </div>
    </header>

    <div class="card p-6 space-y-6">
      <div>
        <label class="text-sm font-semibold">Tournament name</label>
        <input 
          v-model="tournamentName" 
          class="input mt-2" 
          placeholder="e.g. Summer Championship 2024"
          autofocus
        />
      </div>

      <div class="flex items-start gap-3">
        <input 
          v-model="blueShellBonus" 
          type="checkbox" 
          id="blueShellBonus"
          class="mt-1 w-4 h-4 rounded border-zinc-300 text-primary focus:ring-primary"
        />
        <label for="blueShellBonus" class="flex-1 cursor-pointer">
          <div class="text-sm font-semibold">Enable Blue Shell Bonus</div>
          <p class="text-xs text-muted mt-1">If enabled, players who get hit by a blue shell but still win the race will get an extra point.</p>
        </label>
      </div>

      <div class="border-t border-black/5 pt-6">
        <h3 class="section-title mb-4">Add players</h3>
        <p class="text-sm text-muted mb-4">Add all players who will participate in this tournament.</p>
        
        <div class="space-y-4">
          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label class="text-sm font-semibold">Player name</label>
              <input 
                v-model="newPlayerName" 
                class="input mt-2" 
                placeholder="e.g. Alex"
                @keydown.enter.prevent="addPlayer"
              />
            </div>
            <div>
              <label class="text-sm font-semibold">Nickname (optional)</label>
              <input 
                v-model="newPlayerNickname" 
                class="input mt-2" 
                placeholder="e.g. Blue Shell"
                @keydown.enter.prevent="addPlayer"
              />
            </div>
          </div>
          
          <button 
            @click="addPlayer" 
            class="btn btn-primary"
            :disabled="!canAddPlayer"
          >
            Add player
          </button>
        </div>

        <div v-if="players.length > 0" class="mt-6 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold">Players ({{ players.length }})</p>
          </div>
          
          <div class="space-y-2">
            <div
              v-for="(player, index) in players"
              :key="player.id"
              class="card p-3 flex items-center justify-between gap-3"
            >
              <div class="flex-1">
                <p class="font-semibold">{{ player.name }}</p>
                <p v-if="player.nickname" class="text-xs text-muted">{{ player.nickname }}</p>
              </div>
              
              <button
                @click="removePlayer(player.id)"
                class="btn btn-ghost text-xs px-3 text-red-600 hover:bg-red-50"
                title="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div v-else class="mt-6 card p-4 text-sm text-muted text-center">
          No players added yet. Add at least one player to create the tournament.
        </div>
      </div>
    </div>

    <div class="flex gap-3">
      <button 
        @click="createTournament" 
        class="btn btn-primary"
        :disabled="!canSubmit"
      >
        Create tournament
      </button>
      <button @click="cancel" class="btn btn-ghost">Cancel</button>
    </div>
  </section>
</template>
