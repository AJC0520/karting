<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'export'): void
  (event: 'import', payload: { raw: string; mode: 'replace' | 'merge' }): void
}>()

const mode = ref<'replace' | 'merge'>('replace')
const raw = ref('')
const error = ref('')

watch(
  () => props.open,
  () => {
    raw.value = ''
    error.value = ''
  },
)

const handleFile = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    raw.value = String(reader.result ?? '')
  }
  reader.onerror = () => {
    error.value = 'Unable to read file.'
  }
  reader.readAsText(file)
}

const submitImport = () => {
  if (!raw.value.trim()) {
    error.value = 'Choose a JSON file to import.'
    return
  }
  emit('import', { raw: raw.value, mode: mode.value })
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="card w-full max-w-xl p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold">Import / Export</h3>
          <p class="text-sm text-muted">Backup your tournaments or merge new data.</p>
        </div>
        <button class="btn btn-ghost text-xs" type="button" @click="emit('close')">Close</button>
      </div>

      <div class="mt-6 space-y-4">
        <div class="rounded-2xl border border-black/5 bg-black/5 p-4">
          <h4 class="text-sm font-semibold">Export</h4>
          <p class="text-xs text-muted">Download the full schema as JSON.</p>
          <button class="btn btn-primary mt-3" type="button" @click="emit('export')">Download JSON</button>
        </div>

        <div class="rounded-2xl border border-black/5 bg-black/5 p-4">
          <h4 class="text-sm font-semibold">Import</h4>
          <p class="text-xs text-muted">Replace everything or merge by tournament id.</p>
          <div class="mt-3 flex flex-wrap gap-3 text-sm">
            <label class="flex items-center gap-2">
              <input v-model="mode" type="radio" value="replace" />
              Replace all data
            </label>
            <label class="flex items-center gap-2">
              <input v-model="mode" type="radio" value="merge" />
              Merge tournaments
            </label>
          </div>
          <div class="mt-3 space-y-2">
            <input class="input" type="file" accept="application/json" @change="handleFile" />
            <textarea v-model="raw" class="textarea" rows="6" placeholder="Or paste JSON here"></textarea>
          </div>
          <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
          <button class="btn btn-accent mt-3" type="button" @click="submitImport">Import JSON</button>
        </div>
      </div>
    </div>
  </div>
</template>
