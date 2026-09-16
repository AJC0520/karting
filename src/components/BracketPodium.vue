<script setup lang="ts">
interface Player {
  name: string
}

interface PodiumResult {
  placement: number
  player: Player | undefined
}

defineProps<{
  results: PodiumResult[]
}>()

/** Tallest block first in the visual order 2 - 1 - 3 - 4. */
const STEPS = [
  { index: 1, height: 'h-28', label: '2nd', medal: '🥈', block: 'bg-slate-300 text-slate-900', slide: 'podium-slide-2' },
  { index: 0, height: 'h-44', label: 'Champion', medal: '🥇', block: 'bg-yellow-400 text-yellow-950', slide: 'podium-slide-1' },
  { index: 2, height: 'h-20', label: '3rd', medal: '🥉', block: 'bg-orange-400 text-orange-950', slide: 'podium-slide-3' },
  { index: 3, height: 'h-12', label: '4th', medal: '🏁', block: 'bg-zinc-300 text-zinc-900', slide: 'podium-slide-4' },
]
</script>

<template>
  <div class="w-full max-w-5xl mx-auto">
    <div class="mb-6 text-center">
      <p class="font-mk text-3xl mk-text-orange leading-none">FINISH!</p>
    </div>

    <div class="flex items-end justify-center gap-3">
      <div
        v-for="step in STEPS"
        :key="step.index"
        class="flex flex-1 flex-col items-center"
        :class="step.slide"
      >
        <div class="mb-3 space-y-1 text-center">
          <div class="text-4xl leading-none">{{ step.medal }}</div>
          <p class="truncate font-mk text-base uppercase tracking-wide text-ink">
            {{ results[step.index]?.player?.name ?? '—' }}
          </p>
        </div>

        <!-- Podium block: chunky plastic step with a checkered cap -->
        <div class="w-full overflow-hidden rounded-t-lg border-x-[3px] border-t-[3px] border-ink">
          <div class="mk-checker h-3 border-b-2 border-ink"></div>
          <div
            class="flex flex-col items-center justify-center gap-0.5"
            :class="[step.height, step.block]"
          >
            <span class="font-mk text-3xl leading-none">{{ step.index + 1 }}</span>
            <span class="font-mk text-[10px] uppercase tracking-wider opacity-70">
              {{ step.label }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Ground line so the blocks read as standing on a floor, not clipped -->
    <div class="h-1.5 rounded-full bg-ink"></div>
  </div>
</template>

<style scoped>
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.podium-slide-1 { animation: slideUp 0.6s ease-out 0s both; }
.podium-slide-2 { animation: slideUp 0.6s ease-out 0.2s both; }
.podium-slide-3 { animation: slideUp 0.6s ease-out 0.4s both; }
.podium-slide-4 { animation: slideUp 0.6s ease-out 0.6s both; }

@media (prefers-reduced-motion: reduce) {
  .podium-slide-1,
  .podium-slide-2,
  .podium-slide-3,
  .podium-slide-4 {
    animation: none;
  }
}
</style>
