<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TrackMap from '@/components/TrackMap.vue'
import TournamentTabs from '@/components/TournamentTabs.vue'
import { useAppStore } from '@/stores/appStore'

const route = useRoute()
const store = useAppStore()

const tournament = computed(() => store.getTournamentById(route.params.id as string))
</script>

<template>
  <section v-if="tournament" class="space-y-8">
    <header class="space-y-4">
      <div>
        <h2 class="text-3xl font-semibold">{{ tournament.name }}</h2>
      </div>
      <TournamentTabs />
    </header>

    <div>
      <p class="text-sm text-muted mb-4">
        Hover over track locations to see statistics
      </p>
      <div class="card p-6 overflow-x-auto">
        <TrackMap />
      </div>
    </div>
  </section>
</template>
