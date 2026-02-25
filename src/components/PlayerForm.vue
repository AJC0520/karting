<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { Player } from '@/types'

const props = defineProps<{
  player?: Player | null
  defaultInitialPoints: number
  submitLabel?: string
}>()

const emit = defineEmits<{
  (event: 'save', payload: { name: string; nickname?: string; initialPoints?: number }): void
  (event: 'cancel'): void
}>()

const name = ref(props.player?.name ?? '')
const nickname = ref(props.player?.nickname ?? '')
const useOverride = ref(props.player?.initialPoints !== undefined)
const initialPoints = ref(props.player?.initialPoints ?? props.defaultInitialPoints)

watch(
  () => props.player,
  (player) => {
    name.value = player?.name ?? ''
    nickname.value = player?.nickname ?? ''
    useOverride.value = player?.initialPoints !== undefined
    initialPoints.value = player?.initialPoints ?? props.defaultInitialPoints
  },
)

const canSubmit = computed(() => name.value.trim().length > 0)

const save = () => {
  if (!canSubmit.value) return
  emit('save', {
    name: name.value.trim(),
    nickname: nickname.value.trim() || undefined,
    initialPoints: useOverride.value ? Number(initialPoints.value) : undefined,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <div>
      <label class="text-sm font-semibold">Player name</label>
      <input v-model="name" class="input mt-2" placeholder="e.g. Alex" />
    </div>
    <div>
      <label class="text-sm font-semibold">Nickname (optional)</label>
      <input v-model="nickname" class="input mt-2" placeholder="e.g. Blue Shell" />
    </div>
    <div class="space-y-2">
      <label class="text-sm font-semibold">Initial points</label>
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-sm">
          <input v-model="useOverride" type="checkbox" />
          Override tournament default
        </label>
        <input
          v-model="initialPoints"
          class="input w-32"
          type="number"
          :disabled="!useOverride"
          step="1"
        />
        <span class="text-xs text-muted">Default: {{ defaultInitialPoints }}</span>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-primary" type="submit" :disabled="!canSubmit">
        {{ submitLabel ?? 'Save player' }}
      </button>
      <button class="btn btn-ghost" type="button" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
