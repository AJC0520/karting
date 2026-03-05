<script setup lang="ts">
import { computed, ref, toRefs } from 'vue'

const props = defineProps<{
  items: Array<{ label: string; value: string | number; helper?: string; description?: string }>
}>()

const { items } = toRefs(props)
const hoveredIndex = ref<number | null>(null)
const hoveredItem = computed(() => {
  const index = hoveredIndex.value
  return index === null ? null : items.value[index]
})
const hasDescriptions = computed(() => items.value.some((item) => item.description))
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
    </div>
  </div>
  <p v-if="hasDescriptions" class="mt-2 text-xs text-muted">
    <span v-if="hoveredItem?.description">
      <span class="font-semibold text-zinc-800">{{ hoveredItem.label }}:</span>
      {{ hoveredItem.description }}
    </span>
    <span v-else>Hover an achievement to see the description.</span>
  </p>
</template>
