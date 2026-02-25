<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; value: string | number; helper?: string }>
}>()
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <div v-for="item in items" :key="item.label" class="card p-4">
      <p class="text-xs uppercase tracking-wide text-muted">{{ item.label }}</p>
      <p class="mt-2 text-2xl font-semibold">{{ item.value }}</p>
      <p v-if="item.helper" class="mt-1 text-xs text-muted">{{ item.helper }}</p>
    </div>
  </div>
</template>
