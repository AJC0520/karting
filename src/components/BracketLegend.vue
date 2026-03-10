<script setup lang="ts">
import { Bold, RefreshCw } from "lucide-vue-next";
</script>

<template>
  <div class="space-y-4">
    <!-- Joker Explanation Dropdown -->
    <details class="bg-purple-50 rounded-lg border border-purple-200">
      <summary
        class="cursor-pointer p-4 font-semibold text-sm text-purple-900 hover:bg-purple-100 rounded-lg transition-colors"
      >
        🃏 What is a Joker?
      </summary>
      <div class="px-4 pb-4 pt-2">
        <p class="text-sm text-purple-800 leading-relaxed">
          Jokers are placeholder players used to fill races so that each race
          has four participants when there are not enough real players. When
          races are created and fewer than four players are available (with at
          least three real players required), the system automatically adds
          jokers to fill the remaining spots. Each joker is randomly assigned to
          <strong>mimic</strong> one of the real players in the race. Although
          jokers do not drink alcohol, they must
          <strong
            >stop their kart whenever the player they mimic stops to
            drink</strong
          >, which adds a strategic element because a player's drinking breaks
          affect the joker's race. Jokers can compete and progress through the
          tournament just like regular players, moving through winner or loser
          brackets depending on their placement. If the player a joker is
          mimicking is swapped out of a race, the joker is automatically
          reassigned to mimic another random player in that race. Jokers are
          displayed as "🃏 Joker", with information about which player they
          mimic shown in small purple italic text below their name. <b> The ultimate
          goal of a joker is to disrupt the race and potentially ruin the
          placement of other players.</b>
        </p>
      </div>
    </details>

    <!-- Swap Function Explanation Dropdown -->
    <details class="bg-blue-50 rounded-lg border border-blue-200">
      <summary
        class="cursor-pointer p-4 font-semibold text-sm text-blue-900 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
      >
        <RefreshCw :size="14" />
        Player Swap Function
      </summary>
      <div class="px-4 pb-4 pt-2">
        <p class="text-sm text-blue-800 leading-relaxed">
          The player swap function allows you to exchange players between races.
          When you select a player who is already in another race, the system
          performs a <strong>true swap</strong>: the two players exchange
          positions, ensuring no player appears in multiple races
          simultaneously. If you select a player not currently in any race, they
          simply replace the selected player. This feature is primarily intended
          for situations where a
          <strong>joker ends up in an important match</strong>, such as the
          <strong
            >grand finale, qualification finale, or the winner bracket
            finale</strong
          >, and you want to replace them with a real player. It can also be
          used to create specific matchups between players. When swapping, any
          joker that was mimicking either player will be automatically
          reassigned to mimic another player in their race.
        </p>
      </div>
    </details>

    <!-- Legend -->
    <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Race Status -->
        <div class="space-y-2">
          <p class="text-xs font-semibold text-muted mb-2">Race Status:</p>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center"
            >
              <span class="text-amber-600 text-xs">⏱</span>
            </div>
            <span class="text-xs text-ink">Ready to be played</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center"
            >
              <span class="text-green-600 text-xs">✓</span>
            </div>
            <span class="text-xs text-ink">Race is done</span>
          </div>
        </div>

        <!-- Position Colors -->
        <div class="space-y-2">
          <p class="text-xs font-semibold text-muted mb-2">Position Colors:</p>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-4 bg-green-100 border border-green-300 rounded"
            ></div>
            <span class="text-xs text-ink">Advances to next round</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-4 bg-yellow-100 border border-yellow-300 rounded"
            ></div>
            <span class="text-xs text-ink">Still competing (not yet safe)</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span class="text-xs text-ink">Eliminated from tournament</span>
          </div>
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-4 bg-slate-100 border border-slate-300 rounded"
            ></div>
            <span class="text-xs text-ink">Consolation</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
