<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/appStore'

const route = useRoute()
const store = useAppStore()

const tournamentId = computed(() => route.params.id as string)
const currentTournament = computed(() => store.getTournamentById(tournamentId.value))
const otherTournaments = computed(() =>
  store.tournaments.filter((t) => t.id !== tournamentId.value),
)

const links = computed(() => [
  { label: 'Leaderboard', to: `/t/${tournamentId.value}/leaderboard` },
  { label: 'Map', to: `/t/${tournamentId.value}/map` },
  { label: 'Races', to: `/t/${tournamentId.value}/races` },
  { label: 'Add Race', to: `/t/${tournamentId.value}/add-race` },
  { label: 'Players', to: `/t/${tournamentId.value}/players` },
])
</script>

<template>
  <!-- Spacer preserves flex layout width -->
  <aside class="trophy-spacer">
    <!-- Fixed-position trophy -->
    <div class="trophy-wrapper">

    <!-- ══ CUP with handles ══ -->
    <div class="cup-area">
      <div class="handle handle-left"></div>
      <div class="handle handle-right"></div>
      <div class="cup-body">
        <!-- Header band -->
        <div class="cup-header">
          <p class="label-text text-center">Tournament</p>
          <p class="cup-name text-center">{{ currentTournament?.name ?? '…' }}</p>
        </div>
        <!-- Nav links -->
        <nav class="nav-links">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="nav-link"
            :class="route.path === link.to ? 'nav-active' : ''"
          >{{ link.label }}</RouterLink>
        </nav>
      </div>
    </div>

    <!-- ══ STEM ══ -->
    <div class="stem shaft"></div>
    <div class="stem node"></div>
    <div class="stem shaft short"></div>

    <!-- ══ BASE ══ -->
    <div class="base-body">
      <template v-if="otherTournaments.length">
        <p class="label-text base-label text-center">Switch Tournament</p>
        <RouterLink
          v-for="t in otherTournaments"
          :key="t.id"
          :to="`/t/${t.id}/leaderboard`"
          class="nav-link"
        >{{ t.name }}</RouterLink>
      </template>
      <p v-else></p>
    </div>
    <div class="base-foot"></div>

    </div> <!-- end trophy-wrapper -->
  </aside>
</template>

<style scoped>
/* ── Trophy wrapper ── */
/* Spacer holds layout space so main content doesn't shift */
.trophy-spacer {
  width: 13rem;
  flex-shrink: 0;
}

/* Trophy is fixed to viewport — always same position */
.trophy-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 13rem;
  z-index: 10;
}

/* ── Cup + C-shaped handles ── */
.cup-area {
  position: relative;
  width: 100%;
}

.handle {
  position: absolute;
  top: 2rem;
  width: 1.35rem;
  height: 2.2rem;
  border: 3px solid #b45309;
  border-radius: 50%;
  background: #f59e0b;
  z-index: 0;
}
/* Clip to show only the outer C-arch */
.handle-left  { left: 0.35rem;  clip-path: polygon(0 0, 52% 0, 52% 100%, 0 100%); }
.handle-right { right: 0.35rem; clip-path: polygon(48% 0, 100% 0, 100% 100%, 48% 100%); }

.cup-body {
  position: relative;
  z-index: 1;
  margin: 0 1.1rem;
  background: #fde68a;
  border: 2.5px solid #d97706;
  border-radius: 1rem 1rem 2.25rem 2.25rem;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 12px rgba(180,83,9,0.2);
}

/* ── Cup header ── */
.cup-header {
  background: #d97706;
  padding: 0.6rem 0.75rem 0.45rem;
  border-bottom: 1.5px solid #92400e;
}
.label-text {
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(120, 53, 15, 0.75);
  margin-bottom: 0.15rem;
}
.cup-name {
  font-family: 'Bowlby One SC', sans-serif;
  font-size: 0.875rem;
  color: #451a03;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Nav links ── */
.nav-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.4rem 0.4rem 0.8rem;
}
.nav-link {
  display: flex;
  align-items: center;
  padding: 0.35rem 0.5rem;
  border-radius: 0.45rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #78350f;
  text-decoration: none;
  transition: background 0.12s;
}
.nav-link:hover { background: rgba(217, 119, 6, 0.22); }
.nav-active {
  background: rgba(217, 119, 6, 0.32);
  color: #451a03;
  font-weight: 700;
}

/* ── Stem ── */
.stem {
  background: #f59e0b;
}
.shaft {
  width: 0.85rem;
  height: 1.6rem;
  border-left: 1.5px solid #92400e;
  border-right: 1.5px solid #92400e;
}
.short { height: 0.9rem; }
.node {
  width: 2.4rem;
  height: 0.55rem;
  border: 1.5px solid #92400e;
  border-radius: 0.3rem;
}

/* ── Base ── */
.base-body {
  width: 100%;
  background: #fde68a;
  border: 2.5px solid #d97706;
  border-bottom: none;
  border-radius: 0.625rem 0.625rem 0 0;
  padding: 0.4rem 0.375rem 0.5rem;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
}
.base-label { padding: 0 0.25rem 0.2rem; }

.base-foot {
  width: 100%;
  height: 0.6rem;
  background: #b45309;
  border: 2.5px solid #92400e;
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
}
</style>
