import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    session: null,
    loading: true,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    userEmail: (state) => state.user?.email || null,
  },
  actions: {
    async initialize() {
      this.loading = true
      try {
        const { data: { session } } = await supabase.auth.getSession()
        this.session = session
        this.user = session?.user || null

        supabase.auth.onAuthStateChange((_event, session) => {
          this.session = session
          this.user = session?.user || null
        })
      } catch (error) {
        console.error('Failed to initialize auth:', error)
      } finally {
        this.loading = false
      }
    },

    async signUp(email: string, password: string) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      // Create profile
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email || null,
        })
      }

      return data
    },

    async signIn(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return data
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      this.user = null
      this.session = null
    },

    async resetPassword(email: string) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
    },

    async updatePassword(newPassword: string) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
    },
  },
})
