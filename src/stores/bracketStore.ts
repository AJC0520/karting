import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import type { Database, Json } from '@/lib/database.types'

type BracketTournament = Database['public']['Tables']['bracket_tournaments']['Row']
type BracketRace = Database['public']['Tables']['bracket_races']['Row']
type BracketTournamentInsert = Database['public']['Tables']['bracket_tournaments']['Insert']
type BracketRaceInsert = Database['public']['Tables']['bracket_races']['Insert']

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export interface BracketPlayer {
  id: string
  name: string
}

export interface BracketRaceLocal {
  id: string
  round: string
  slot: number
  players: string[]
  placements: string[]
  completed: boolean
  joker_mimics?: Record<string, string> // Maps joker ID to player ID they're mimicking
}

interface BracketState {
  tournaments: BracketTournament[]
  currentTournament: BracketTournament | null
  currentRaces: BracketRaceLocal[]
  loading: boolean
  error: string | null
}

export const useBracketStore = defineStore('bracket', {
  state: (): BracketState => ({
    tournaments: [],
    currentTournament: null,
    currentRaces: [],
    loading: false,
    error: null,
  }),

  getters: {
    completedTournaments: (state): BracketTournament[] => state.tournaments.filter(t => t.completed),
    activeTournaments: (state): BracketTournament[] => state.tournaments.filter(t => !t.completed),
  },

  actions: {
    async fetchTournaments() {
      const authStore = useAuthStore()
      if (!authStore.user) {
        this.error = 'User not authenticated'
        return
      }

      this.loading = true
      this.error = null

      try {
        const { data, error } = await supabase
          .from('bracket_tournaments')
          .select('*')
          .eq('user_id', authStore.user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        this.tournaments = data || []
      } catch (e: any) {
        console.error('Failed to fetch tournaments:', e)
        this.error = e.message || 'Failed to fetch tournaments'
      } finally {
        this.loading = false
      }
    },

    async createTournament(name: string, players: BracketPlayer[]) {
      const authStore = useAuthStore()
      if (!authStore.user) {
        this.error = 'User not authenticated'
        return null
      }

      this.loading = true
      this.error = null

      try {
        const tournamentData: BracketTournamentInsert = {
          id: generateUUID(),
          user_id: authStore.user.id,
          name,
          players: players as unknown as Json,
          current_round: 'Winner bracket 1',
          completed: false,
          created_at: new Date().toISOString(),
        }

        const { data, error } = await supabase
          .from('bracket_tournaments')
          .insert(tournamentData)
          .select()
          .single()

        if (error) throw error
        
        this.currentTournament = data
        this.tournaments.unshift(data)
        
        return data
      } catch (e: any) {
        console.error('Failed to create tournament:', e)
        this.error = e.message || 'Failed to create tournament'
        return null
      } finally {
        this.loading = false
      }
    },

    async loadTournament(tournamentId: string) {
      this.loading = true
      this.error = null

      try {
        // Load tournament
        const { data: tournament, error: tournamentError } = await supabase
          .from('bracket_tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single()

        if (tournamentError) throw tournamentError
        this.currentTournament = tournament

        // Load races
        const { data: races, error: racesError } = await supabase
          .from('bracket_races')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('race_number', { ascending: true })

        if (racesError) throw racesError

        // Convert database races to local format
        this.currentRaces = (races || []).map(race => ({
          id: race.id,
          round: race.round,
          slot: race.race_number,
          players: race.players as string[],
          placements: (race.placements as string[]) || [],
          completed: race.completed,
        }))

        return { tournament, races: this.currentRaces }
      } catch (e: any) {
        console.error('Failed to load tournament:', e)
        this.error = e.message || 'Failed to load tournament'
        return null
      } finally {
        this.loading = false
      }
    },

    async saveRace(race: BracketRaceLocal) {
      if (!this.currentTournament) {
        this.error = 'No active tournament'
        return
      }

      try {
        const raceData: BracketRaceInsert = {
          id: generateUUID(),
          tournament_id: this.currentTournament.id,
          round: race.round,
          race_number: race.slot,
          players: race.players as unknown as Json,
          placements: race.placements as unknown as Json,
          completed: race.completed,
          created_at: new Date().toISOString(),
        }

        // Check if race already exists
        const { data: existing } = await supabase
          .from('bracket_races')
          .select('id')
          .eq('tournament_id', this.currentTournament.id)
          .eq('round', race.round)
          .eq('race_number', race.slot)
          .single()

        if (existing) {
          // Update existing race
          const { error } = await supabase
            .from('bracket_races')
            .update({
              placements: race.placements as unknown as Json,
              completed: race.completed,
            })
            .eq('id', existing.id)

          if (error) throw error
        } else {
          // Insert new race
          const { error } = await supabase
            .from('bracket_races')
            .insert(raceData)

          if (error) throw error
        }
      } catch (e: any) {
        console.error('Failed to save race:', e)
        this.error = e.message || 'Failed to save race'
      }
    },

    async updateTournamentRound(round: string) {
      if (!this.currentTournament) return

      try {
        const { error } = await supabase
          .from('bracket_tournaments')
          .update({ current_round: round })
          .eq('id', this.currentTournament.id)

        if (error) throw error
        this.currentTournament.current_round = round
      } catch (e: any) {
        console.error('Failed to update tournament round:', e)
        this.error = e.message || 'Failed to update round'
      }
    },

    async completeTournament() {
      if (!this.currentTournament) return

      try {
        const { error } = await supabase
          .from('bracket_tournaments')
          .update({ completed: true })
          .eq('id', this.currentTournament.id)

        if (error) throw error
        
        this.currentTournament.completed = true
        
        // Update in tournaments list
        const index = this.tournaments.findIndex(t => t.id === this.currentTournament?.id)
        if (index !== -1) {
          this.tournaments[index].completed = true
        }
      } catch (e: any) {
        console.error('Failed to complete tournament:', e)
        this.error = e.message || 'Failed to complete tournament'
      }
    },

    async deleteTournament(tournamentId: string) {
      try {
        // Delete races first (foreign key constraint)
        await supabase
          .from('bracket_races')
          .delete()
          .eq('tournament_id', tournamentId)

        // Delete tournament
        const { error } = await supabase
          .from('bracket_tournaments')
          .delete()
          .eq('id', tournamentId)

        if (error) throw error

        // Remove from local state
        this.tournaments = this.tournaments.filter(t => t.id !== tournamentId)
        
        if (this.currentTournament?.id === tournamentId) {
          this.currentTournament = null
          this.currentRaces = []
        }
      } catch (e: any) {
        console.error('Failed to delete tournament:', e)
        this.error = e.message || 'Failed to delete tournament'
      }
    },

    clearCurrent() {
      this.currentTournament = null
      this.currentRaces = []
    },
  },
})
