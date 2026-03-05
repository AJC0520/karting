<template>
  <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Race Status -->
      <div class="space-y-2">
        <p class="text-xs font-semibold text-muted mb-2">Race Status:</p>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
            <span class="text-amber-600 text-xs">⏱</span>
          </div>
          <span class="text-xs text-ink">Ready to be played</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
            <span class="text-green-600 text-xs">✓</span>
          </div>
          <span class="text-xs text-ink">Race is done</span>
        </div>
      </div>
      
      <!-- Position Colors -->
      <div class="space-y-2">
        <p class="text-xs font-semibold text-muted mb-2">Position Colors:</p>
        <div class="flex items-center gap-2">
          <div class="w-6 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span class="text-xs text-ink">Advances to next round</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span class="text-xs text-ink">Still competing (not yet safe)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span class="text-xs text-ink">Eliminated from tournament</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-6 h-4 bg-slate-100 border border-slate-300 rounded"></div>
          <span class="text-xs text-ink">Consolation (5-8th place)</span>
        </div>
      </div>
    </div>
  </div>
</template>
