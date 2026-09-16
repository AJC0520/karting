<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { OUTCOME_CLASS, type OutcomeTone } from '@/utils/bracketDisplay'

/** Every badge a driver row can show, and what it means for that driver. */
const OUTCOMES: Array<{ tone: OutcomeTone; label: string; meaning: string }> = [
  { tone: 'adv', label: 'Advances', meaning: 'Through to the next race in this bracket.' },
  { tone: 'drop', label: 'Loser bkt', meaning: 'Still alive, but dropped into the loser bracket.' },
  { tone: 'final', label: 'Grand final', meaning: 'Through to a decider — the grand or qual final.' },
  { tone: 'out', label: 'Out', meaning: 'Knocked out. Their connector line dead-ends here.' },
  { tone: 'none', label: '5th', meaning: 'Final placing from the consolation race.' },
]
</script>

<template>
  <div class="space-y-4">
    <!-- Quick reference: what you are looking at on a race card -->
    <div class="mk-panel overflow-hidden">
      <div class="mk-plate mk-plate-green">Reading a race card</div>
      <div class="grid grid-cols-1 gap-5 p-4 md:grid-cols-2">
        <div class="space-y-2">
          <p class="mb-2 font-mk text-[11px] uppercase tracking-wider text-ink">Race status</p>
          <div class="flex items-center gap-2">
            <span class="mk-flag mk-flag-ready">Ready</span>
            <span class="text-xs text-ink">Ready to be played — click to enter results</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="mk-flag mk-flag-done">Done</span>
            <span class="text-xs text-ink">Race is finished</span>
          </div>

          <p class="mb-2 pt-3 font-mk text-[11px] uppercase tracking-wider text-ink">Driver row</p>
          <div class="flex items-center gap-2">
            <span class="h-5 w-[7px] flex-shrink-0 rounded bg-rose-600"></span>
            <span class="text-xs text-ink">
              The stripe is that driver's colour for the whole tournament — hover
              a row to trace their path through the bracket.
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="mk-rank">1</span>
            <span class="text-xs text-ink">Where they finished this race</span>
          </div>
        </div>

        <div class="space-y-2">
          <p class="mb-2 font-mk text-[11px] uppercase tracking-wider text-ink">Where it sends them</p>
          <div v-for="item in OUTCOMES" :key="item.tone" class="flex items-start gap-2">
            <span class="mk-outcome mt-0.5" :class="OUTCOME_CLASS[item.tone]">{{ item.label }}</span>
            <span class="text-xs text-ink">{{ item.meaning }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Joker -->
    <details class="mk-panel overflow-hidden border-purple-900">
      <summary
        class="mk-plate cursor-pointer list-none transition hover:brightness-110"
        style="background: linear-gradient(180deg, #a855f7 0%, #7e22ce 100%)"
      >
        🃏 What is a Joker?
      </summary>
      <div class="bg-purple-50 p-4">
        <p class="text-sm leading-relaxed text-purple-950">
          Jokers are placeholder players used to fill races so that each race has
          four participants when there are not enough real players. When races are
          created and fewer than four players are available (with at least three
          real players required), the system automatically adds jokers to fill the
          remaining spots. Each joker is randomly assigned to
          <strong>mimic</strong> one of the real players in the race. Although
          jokers do not drink alcohol, they must
          <strong>stop their kart whenever the player they mimic stops to drink</strong>,
          which adds a strategic element because a player's drinking breaks affect
          the joker's race. Jokers can compete and progress through the tournament
          just like regular players, moving through winner or loser brackets
          depending on their placement. If the player a joker is mimicking is
          swapped out of a race, the joker is automatically reassigned to mimic
          another random player in that race. Jokers are displayed as "🃏 Joker",
          with information about which player they mimic shown in small purple
          italic text below their name.
          <b>
            The ultimate goal of a joker is to disrupt the race and potentially
            ruin the placement of other players.
          </b>
        </p>
      </div>
    </details>

    <!-- Swap -->
    <details class="mk-panel overflow-hidden border-blue-900">
      <summary
        class="mk-plate flex cursor-pointer list-none items-center gap-2 transition hover:brightness-110"
        style="background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)"
      >
        <RefreshCw :size="14" />
        Player Swap Function
      </summary>
      <div class="bg-blue-50 p-4">
        <p class="text-sm leading-relaxed text-blue-950">
          The player swap function allows you to exchange players between races.
          When you select a player who is already in another race, the system
          performs a <strong>true swap</strong>: the two players exchange
          positions, ensuring no player appears in multiple races simultaneously.
          If you select a player not currently in any race, they simply replace the
          selected player. This feature is primarily intended for situations where
          a <strong>joker ends up in an important match</strong>, such as the
          <strong>grand finale, qualification finale, or the winner bracket finale</strong>,
          or if a joker ends up in the <strong>consolation match</strong>, and you
          want to replace them with a real player. It can also be used to create
          specific matchups between players. When swapping, any joker that was
          mimicking either player will be automatically reassigned to mimic another
          player in their race.
        </p>
      </div>
    </details>
  </div>
</template>
