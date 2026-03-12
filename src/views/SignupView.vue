<template>
  <div
    class="min-h-screen flex items-center justify-center bg-cover bg-center py-12 px-4"
    style="background-color: lightblue;"
  >
    <div class="w-full max-w-md">
      <!-- Logo -->
      <h1 class="font-mk text-center mb-8" style="font-size: 3.5rem; line-height: 1;">
        <span class="mk-text-orange">KART</span><span class="mk-text-red">TRACKER</span>
      </h1>

      <div class="bg-black/70 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
        <h2 class="font-mk text-2xl text-white text-center mb-6">CREATE ACCOUNT</h2>

        <form class="space-y-4" @submit.prevent="handleSignUp">
          <div v-if="error" class="rounded-xl bg-red-900/60 border border-red-500/40 p-3">
            <div class="text-sm text-red-300">{{ error }}</div>
          </div>
          <div v-if="message" class="rounded-xl bg-green-900/60 border border-green-500/40 p-3">
            <div class="text-sm text-green-300">{{ message }}</div>
          </div>

          <div>
            <label class="block text-white/70 text-xs font-semibold mb-1 uppercase tracking-wide">Email</label>
            <input v-model="email" type="email" autocomplete="email" required class="input" placeholder="your@email.com" />
          </div>
          <div>
            <label class="block text-white/70 text-xs font-semibold mb-1 uppercase tracking-wide">Password</label>
            <input v-model="password" type="password" autocomplete="new-password" required class="input" placeholder="Min 6 characters" minlength="6" />
          </div>
          <div>
            <label class="block text-white/70 text-xs font-semibold mb-1 uppercase tracking-wide">Confirm Password</label>
            <input v-model="passwordConfirm" type="password" autocomplete="new-password" required class="input" placeholder="Repeat password" />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="mk-menu-btn w-full mt-2"
            style="font-size: 1.1rem; padding: 12px;"
          >
            {{ loading ? 'CREATING...' : 'SIGN UP' }}
          </button>
        </form>

        <p class="mt-4 text-center text-white/50 text-sm">
          Already have an account?
          <router-link to="/login" class="text-yellow-400 hover:text-yellow-300 font-semibold">Sign in</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const error = ref('')
const message = ref('')

async function handleSignUp() {
  loading.value = true
  error.value = ''
  message.value = ''

  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwords do not match'
    loading.value = false
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    loading.value = false
    return
  }

  try {
    await authStore.signUp(email.value, password.value)
    message.value = 'Account created! You can now sign in.'
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (e: any) {
    error.value = e.message || 'Failed to create account'
  } finally {
    loading.value = false
  }
}
</script>
