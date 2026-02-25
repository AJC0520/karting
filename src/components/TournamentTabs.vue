<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const tournamentId = computed(() => route.params.id as string)

const links = computed(() => [
  { label: 'Leaderboard', to: `/t/${tournamentId.value}/leaderboard` },
  { label: 'Races', to: `/t/${tournamentId.value}/races` },
  { label: 'Add Race', to: `/t/${tournamentId.value}/add-race` },
  { label: 'Players', to: `/t/${tournamentId.value}/players` },
  { label: 'Map', to: `/t/${tournamentId.value}/map` },
])
</script>

<template>
  <nav class="flex flex-wrap gap-2">
    <RouterLink
      v-for="link in links"
      :key="link.to"
      class="btn btn-ghost text-sm"
      :to="link.to"
      :class="route.path === link.to ? 'bg-primary/10 text-primary' : ''"
    >
      {{ link.label }}
    </RouterLink>
  </nav>
</template>
