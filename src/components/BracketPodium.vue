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
</script>

<template>
  <div class="w-full max-w-5xl mx-auto">
    <div class="flex items-end justify-center gap-3">
      <!-- 2nd Place -->
      <div class="flex-1 flex flex-col items-center podium-slide-2">
        <div class="text-center mb-4 space-y-2">
          <div class="text-4xl font-bold mb-2 text-slate-300">🥈</div>
          <p class="font-semibold text-lg">{{ results[1]?.player?.name }}</p>
          <div class="mt-3">
            <p class="text-2xl font-bold">2nd</p>
          </div>
        </div>
        <div 
          class="w-full h-32 rounded-t-lg flex flex-col items-center justify-center transition-all bg-slate-300 text-slate-950"
        >
          <div class="text-3xl font-bold">2</div>
        </div>
      </div>
      
      <!-- 1st Place -->
      <div class="flex-1 flex flex-col items-center podium-slide-1">
        <div class="text-center mb-4 space-y-2">
          <div class="text-4xl font-bold mb-2 text-amber-400">🥇</div>
          <p class="font-semibold text-lg">{{ results[0]?.player?.name }}</p>
          <div class="mt-3">
            <p class="text-2xl font-bold">Champion!</p>
          </div>
        </div>
        <div 
          class="w-full h-48 rounded-t-lg flex flex-col items-center justify-center transition-all bg-amber-400 text-amber-950"
        >
          <div class="text-4xl font-bold">1</div>
        </div>
      </div>
      
      <!-- 3rd Place -->
      <div class="flex-1 flex flex-col items-center podium-slide-3">
        <div class="text-center mb-4 space-y-2">
          <div class="text-4xl font-bold mb-2 text-orange-600">🥉</div>
          <p class="font-semibold text-lg">{{ results[2]?.player?.name }}</p>
          <div class="mt-3">
            <p class="text-2xl font-bold">3rd</p>
          </div>
        </div>
        <div 
          class="w-full h-20 rounded-t-lg flex flex-col items-center justify-center transition-all bg-orange-600 text-orange-50"
        >
          <div class="text-2xl font-bold">3</div>
        </div>
      </div>
      
      <!-- 4th Place -->
      <div class="flex-1 flex flex-col items-center podium-slide-4">
        <div class="text-center mb-4 space-y-2">
          <div class="text-2xl font-bold mb-2 text-zinc-400">4th</div>
          <p class="font-semibold text-lg">{{ results[3]?.player?.name }}</p>
          <div class="mt-3">
            <p class="text-xl font-bold">4th</p>
          </div>
        </div>
        <div 
          class="w-full h-12 rounded-t-lg flex flex-col items-center justify-center transition-all bg-zinc-400 text-zinc-950"
        >
          <div class="text-xl font-bold">4</div>
        </div>
      </div>
    </div>
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

.podium-slide-1 {
  animation: slideUp 0.6s ease-out 0s both;
}

.podium-slide-2 {
  animation: slideUp 0.6s ease-out 0.2s both;
}

.podium-slide-3 {
  animation: slideUp 0.6s ease-out 0.4s both;
}

.podium-slide-4 {
  animation: slideUp 0.6s ease-out 0.6s both;
}
</style>
