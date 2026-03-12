<script setup lang="ts">
// Home splash page
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden bg-scene">
    <!-- Sky image 1 — left side, higher up -->
    <div
      class="absolute inset-0"
      style="
        background-image: url('/Sky1.png');
        background-size: 48% auto;
        background-repeat: no-repeat;
        background-position: 0% 8%;
      "
    />
    <!-- Sky image 2 — right side, a bit lower -->
    <div
      class="absolute inset-0"
      style="
        background-image: url('/Sky1.png');
        background-size: 48% auto;
        background-repeat: no-repeat;
        background-position: 100% 22%;
      "
    />

    <!-- Grass/ground gradient at bottom -->
    <div class="absolute inset-0 bg-ground-fade pointer-events-none" />

    <!-- Logo (behind Mario) -->
    <div class="absolute top-12 left-0 right-0 flex justify-center pointer-events-none select-none" style="z-index: 1;">
      <h1 class="font-mk leading-none" style="font-size: clamp(5rem, 12vw, 9rem);">
        <span class="mk-text-orange">KART</span><span class="mk-text-red">TRACKER</span>
      </h1>
    </div>

    <!-- Mario character — head pokes in front of the R/T join -->
    <img
      src="/Mario.png"
      alt="Mario"
      class="absolute object-contain pointer-events-none"
      style="bottom: 13%; left: 50%; transform: translateX(-62%); height: 56%; z-index: 2;"
    />

    <!-- Coins — close to Mario's right -->
    <img
      src="/Coin 1.png"
      alt=""
      class="absolute object-contain pointer-events-none animate-coin-bob"
      style="bottom: 18%; left: calc(50% + 16%); width: 5%; z-index: 1;"
    />
    <img
      src="/Coin 1.png"
      alt=""
      class="absolute object-contain pointer-events-none animate-coin-bob"
      style="bottom: 26%; left: calc(50% + 24%); width: 6%; animation-delay: 0.4s; z-index: 1;"
    />

    <!-- Bottom menu strip — racing stripes -->
    <div class="absolute bottom-0 left-0 right-0 race-strip-bg">
      <div class="flex items-center justify-center gap-10 py-6 px-8">
        <RouterLink to="/tournaments" class="mk-menu-btn">TOURNAMENTS</RouterLink>
        <RouterLink to="/beeriokart" class="mk-menu-btn">BEERIOKART</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sky-blue top fading into dark green at the bottom, like MK */
.bg-scene {
  background: linear-gradient(
    to bottom,
    #5F8FF6 25%,
    #042104 68%
  );
}

/* Racing-stripe bottom bar — diagonal red/white repeating */
.race-strip-bg {
  background: repeating-linear-gradient(
    -45deg,
    #ffffff 0px,
    #ffffff 20px,
    #cc0000 20px,
    #cc0000 40px
  );
  border-top: 4px solid #880000;
}

/* Darken the lower 40% so the ground reads as shadowed */
.bg-ground-fade {
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(0, 0, 0, 0.45) 100%
  );
}

@keyframes coin-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.animate-coin-bob {
  animation: coin-bob 1.6s ease-in-out infinite;
}
</style>
