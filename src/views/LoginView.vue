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
        <h2 class="font-mk text-2xl text-white text-center mb-6">SIGN IN</h2>

        <form class="space-y-4" @submit.prevent="handleSignIn">
          <div v-if="error" class="rounded-xl bg-red-900/60 border border-red-500/40 p-3">
            <div class="text-sm text-red-300">{{ error }}</div>
          </div>
          <div v-if="message" class="rounded-xl bg-green-900/60 border border-green-500/40 p-3">
            <div class="text-sm text-green-300">{{ message }}</div>
          </div>

          <div>
            <label class="block text-white/70 text-xs font-semibold mb-1 uppercase tracking-wide">Email</label>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="input"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label class="block text-white/70 text-xs font-semibold mb-1 uppercase tracking-wide">Password</label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="input"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="mk-menu-btn w-full mt-2"
            style="font-size: 1.1rem; padding: 12px;"
          >
            {{ loading ? 'SIGNING IN...' : 'SIGN IN' }}
          </button>
        </form>

        <div class="mt-4 text-center space-y-2">
          <button
            type="button"
            class="text-yellow-400 hover:text-yellow-300 text-sm font-semibold transition-colors"
            @click="showResetPassword = true"
          >
            Forgot password?
          </button>
          <p class="text-white/50 text-sm">
            No account?
            <router-link to="/signup" class="text-yellow-400 hover:text-yellow-300 font-semibold">Sign up</router-link>
          </p>
        </div>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div
      v-if="showResetPassword"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      @click.self="showResetPassword = false"
    >
      <div class="bg-gray-900/95 backdrop-blur rounded-2xl p-6 w-full max-w-sm border border-white/10">
        <h3 class="font-mk text-xl text-white mb-4">RESET PASSWORD</h3>
        <form @submit.prevent="handleResetPassword" class="space-y-3">
          <input
            v-model="resetEmail"
            type="email"
            placeholder="Enter your email"
            required
            class="input"
          />
          <div class="flex gap-2">
            <button type="submit" :disabled="loading" class="btn btn-primary flex-1">
              Send Reset Link
            </button>
            <button type="button" class="btn btn-ghost" @click="showResetPassword = false">
              Cancel
            </button>
          </div>
        </form>
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
const resetEmail = ref('')
const loading = ref(false)
const error = ref('')
const message = ref('')
const showResetPassword = ref(false)

async function handleSignIn() {
  loading.value = true
  error.value = ''
  try {
    await authStore.signIn(email.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e.message || 'Failed to sign in'
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    await authStore.resetPassword(resetEmail.value)
    message.value = 'Password reset email sent! Check your inbox.'
    showResetPassword.value = false
    resetEmail.value = ''
  } catch (e: any) {
    error.value = e.message || 'Failed to send reset email'
  } finally {
    loading.value = false
  }
}
</script>
