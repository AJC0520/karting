<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  items: Array<{ label: string; value: string | number; helper?: string; description?: string }>
}>()

const hoveredIndex = ref<number | null>(null)
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div 
      v-for="(item, index) in items" 
      :key="item.label" 
      class="card p-4 relative"
      @mouseenter="hoveredIndex = index"
      @mouseleave="hoveredIndex = null"
    >
      <div class="flex items-center gap-2">
        <p class="text-xs uppercase tracking-wide text-muted">{{ item.label }}</p>
        <svg 
          v-if="item.description" 
          class="w-3 h-3 text-muted/60 cursor-help" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="mt-2 text-2xl font-semibold">{{ item.value }}</p>
      <p v-if="item.helper" class="mt-1 text-xs text-muted">{{ item.helper }}</p>
      
      <!-- Tooltip -->
      <div 
        v-if="item.description && hoveredIndex === index"
        class="absolute z-10 left-0 right-0 -bottom-2 translate-y-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 shadow-lg"
      >
        {{ item.description }}
      </div>
    </div>
  </div>
</template>
