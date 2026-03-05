<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="space-y-8">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 class="text-3xl font-semibold">How to use</h2>
        <p class="text-sm text-muted mt-1">Quick guide to set up a tournament and track results.</p>
      </div>
      <button class="btn btn-ghost" type="button" @click="router.back()">Back</button>
    </header>

    <div class="grid gap-6 md:grid-cols-2">
      <div class="card p-6">
        <h3 class="section-title">Getting started</h3>
        <ol class="mt-3 space-y-2 text-sm text-muted list-decimal list-inside">
          <li>Create a tournament and add the players.</li>
          <li>Set initial points if you want a head start.</li>
        </ol>
      </div>

      <div class="card p-6">
        <h3 class="section-title">Add races</h3>
        <ol class="mt-3 space-y-2 text-sm text-muted list-decimal list-inside">
          <li>Pick the track and race date.</li>
          <li>Enter each player’s finish position.</li>
        </ol>
      </div>

      <div class="card p-6 md:col-span-2">
        <h3 class="section-title">Use the views</h3>
        <div class="mt-3 grid gap-3 text-sm text-muted md:grid-cols-2">
          <div class="rounded-lg border border-black/5 bg-black/5 px-4 py-3">
            <p class="font-semibold text-ink">Leaderboard</p>
            <p class="mt-1">See standings, podiums, and point trends.</p>
          </div>
          <div class="rounded-lg border border-black/5 bg-black/5 px-4 py-3">
            <p class="font-semibold text-ink">Races</p>
            <p class="mt-1">Review every race and edit results if needed.</p>
          </div>
          <div class="rounded-lg border border-black/5 bg-black/5 px-4 py-3">
            <p class="font-semibold text-ink">Players</p>
            <p class="mt-1">Compare player stats and recent form.</p>
          </div>
          <div class="rounded-lg border border-black/5 bg-black/5 px-4 py-3">
            <p class="font-semibold text-ink">Map</p>
            <p class="mt-1">See track hotspots and performance summaries.</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
