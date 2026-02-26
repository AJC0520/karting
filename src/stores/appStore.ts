import { defineStore } from 'pinia'

import type { AppData, Player, Race, Tournament, TournamentSettings } from '@/types'
import { createId } from '@/utils/id'
import { defaultTournamentSettings } from '@/utils/defaults'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'

type PlayerInput = {
  name: string
  nickname?: string
  initialPoints?: number
}

interface AppState extends AppData {
  loading: boolean
  error: string | null
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    tournaments: [],
    loading: false,
    error: null,
  }),
  getters: {
    getTournamentById: (state) => {
      return (id: string) => state.tournaments.find((tournament) => tournament.id === id)
    },
  },
  actions: {
    async loadTournaments() {
      const authStore = useAuthStore()
      if (!authStore.user) {
        this.tournaments = []
        return
      }

      this.loading = true
      this.error = null

      try {
        // Load tournaments
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('user_id', authStore.user.id)
          .order('updated_at', { ascending: false })

        if (tournamentsError) throw tournamentsError

        // Load players for all tournaments
        const tournamentIds = tournamentsData?.map(t => t.id) || []
        
        const { data: playersData, error: playersError } = tournamentIds.length > 0
          ? await supabase
              .from('players')
              .select('*')
              .in('tournament_id', tournamentIds)
          : { data: [], error: null }

        if (playersError) throw playersError

        // Load races for all tournaments
        const { data: racesData, error: racesError } = tournamentIds.length > 0
          ? await supabase
              .from('races')
              .select('*')
              .in('tournament_id', tournamentIds)
              .order('timestamp', { ascending: false })
          : { data: [], error: null }

        if (racesError) throw racesError

        // Transform data to match app structure
        this.tournaments = (tournamentsData || []).map(t => ({
          id: t.id,
          name: t.name,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          settings: {
            initialPoints: t.initial_points,
            pointsByPlacement: t.points_by_placement as number[],
            tieHandling: t.tie_handling as 'split' | 'manual',
            blueShellBonus: t.blue_shell_bonus ?? false,
          },
          players: (playersData || [])
            .filter(p => p.tournament_id === t.id)
            .map(p => ({
              id: p.id,
              name: p.name,
              nickname: p.nickname || undefined,
              createdAt: p.created_at,
              archived: p.archived,
              initialPoints: p.initial_points !== null ? p.initial_points : undefined,
            })),
          races: (racesData || [])
            .filter(r => r.tournament_id === t.id)
            .map(r => ({
              id: r.id,
              tournamentId: r.tournament_id,
              timestamp: r.timestamp,
              track: r.track,
              placements: r.placements as string[],
              notes: r.notes || undefined,
              status: r.status as Record<string, 'ok' | 'dnf' | 'dq'> | undefined,
              rankByPlayer: r.rank_by_player as Record<string, number> | undefined,
              manualPoints: r.manual_points as Record<string, number> | undefined,
              blueShells: r.blue_shells as string[] | undefined,
            })),
        }))
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to load tournaments:', error)
      } finally {
        this.loading = false
      }
    },

    async createTournament(name: string, blueShellBonus: boolean = false): Promise<string | null> {
      const authStore = useAuthStore()
      if (!authStore.user) return null

      const now = new Date().toISOString()
      const settings = defaultTournamentSettings()
      const id = createId()

      try {
        const { error } = await supabase.from('tournaments').insert({
          id,
          user_id: authStore.user.id,
          name: name.trim() || 'New tournament',
          created_at: now,
          updated_at: now,
          initial_points: settings.initialPoints,
          points_by_placement: settings.pointsByPlacement,
          tie_handling: settings.tieHandling,
          blue_shell_bonus: blueShellBonus,
        })

        if (error) throw error

        // Add to local state
        const tournament: Tournament = {
          id,
          name: name.trim() || 'New tournament',
          createdAt: now,
          updatedAt: now,
          settings: {
            ...settings,
            blueShellBonus,
          },
          players: [],
          races: [],
        }
        this.tournaments.unshift(tournament)
        return id
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to create tournament:', error)
        return null
      }
    },

    async renameTournament(id: string, name: string): Promise<void> {
      const tournament = this.tournaments.find((item) => item.id === id)
      if (!tournament) return

      const newName = name.trim() || tournament.name
      const now = new Date().toISOString()

      try {
        const { error } = await supabase
          .from('tournaments')
          .update({ name: newName, updated_at: now })
          .eq('id', id)

        if (error) throw error

        tournament.name = newName
        tournament.updatedAt = now
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to rename tournament:', error)
      }
    },

    async deleteTournament(id: string): Promise<void> {
      try {
        const { error } = await supabase.from('tournaments').delete().eq('id', id)

        if (error) throw error

        this.tournaments = this.tournaments.filter((item) => item.id !== id)
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to delete tournament:', error)
      }
    },

    async updateTournamentSettings(id: string, settings: Partial<TournamentSettings>): Promise<void> {
      const tournament = this.tournaments.find((item) => item.id === id)
      if (!tournament) return

      const newSettings = {
        ...tournament.settings,
        ...settings,
        pointsByPlacement: settings.pointsByPlacement
          ? [...settings.pointsByPlacement]
          : tournament.settings.pointsByPlacement,
      }

      const now = new Date().toISOString()

      try {
        const { error } = await supabase
          .from('tournaments')
          .update({
            initial_points: newSettings.initialPoints,
            points_by_placement: newSettings.pointsByPlacement,
            tie_handling: newSettings.tieHandling,
            updated_at: now,
          })
          .eq('id', id)

        if (error) throw error

        tournament.settings = newSettings
        tournament.updatedAt = now
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to update tournament settings:', error)
      }
    },
    async addPlayer(tournamentId: string, input: PlayerInput): Promise<string | null> {
      const tournament = this.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return null

      const now = new Date().toISOString()
      const id = createId()

      const player: Player = {
        id,
        name: input.name.trim(),
        nickname: input.nickname?.trim() || undefined,
        createdAt: now,
        archived: false,
        initialPoints:
          input.initialPoints !== undefined && Number.isFinite(input.initialPoints)
            ? input.initialPoints
            : undefined,
      }

      try {
        const { error } = await supabase.from('players').insert({
          id,
          tournament_id: tournamentId,
          name: player.name,
          nickname: player.nickname || null,
          created_at: now,
          archived: false,
          initial_points: player.initialPoints !== undefined ? player.initialPoints : null,
        })

        if (error) throw error

        // Update tournament updated_at
        await supabase
          .from('tournaments')
          .update({ updated_at: now })
          .eq('id', tournamentId)

        tournament.players.push(player)
        tournament.updatedAt = now
        return id
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to add player:', error)
        return null
      }
    },

    async updatePlayer(tournamentId: string, playerId: string, updates: PlayerInput): Promise<void> {
      const tournament = this.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return
      const player = tournament.players.find((item) => item.id === playerId)
      if (!player) return

      const now = new Date().toISOString()

      try {
        const { error } = await supabase
          .from('players')
          .update({
            name: updates.name.trim(),
            nickname: updates.nickname?.trim() || null,
            initial_points:
              updates.initialPoints !== undefined && Number.isFinite(updates.initialPoints)
                ? updates.initialPoints
                : null,
          })
          .eq('id', playerId)

        if (error) throw error

        // Update tournament updated_at
        await supabase
          .from('tournaments')
          .update({ updated_at: now })
          .eq('id', tournamentId)

        player.name = updates.name.trim()
        player.nickname = updates.nickname?.trim() || undefined
        player.initialPoints =
          updates.initialPoints !== undefined && Number.isFinite(updates.initialPoints)
            ? updates.initialPoints
            : undefined
        tournament.updatedAt = now
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to update player:', error)
      }
    },

    async removePlayer(tournamentId: string, playerId: string): Promise<boolean> {
      const tournament = this.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return false

      const now = new Date().toISOString()

      try {
        const { error } = await supabase.from('players').delete().eq('id', playerId)

        if (error) throw error

        // Update tournament updated_at
        await supabase
          .from('tournaments')
          .update({ updated_at: now })
          .eq('id', tournamentId)

        tournament.players = tournament.players.filter((player) => player.id !== playerId)
        tournament.updatedAt = now
        return true
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to remove player:', error)
        return false
      }
    },
async addRace(tournamentId: string, race: Race): Promise<string | null> {
      const tournament = this.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return null

      const now = new Date().toISOString()

      try {
        const { error } = await supabase.from('races').insert({
          id: race.id,
          tournament_id: tournamentId,
          timestamp: race.timestamp,
          track: race.track,
          placements: race.placements,
          notes: race.notes || null,
          status: race.status || null,
          rank_by_player: race.rankByPlayer || null,
          manual_points: race.manualPoints || null,
          blue_shells: race.blueShells || null,
        })

        if (error) throw error

        // Update tournament updated_at
        await supabase
          .from('tournaments')
          .update({ updated_at: now })
          .eq('id', tournamentId)

        tournament.races.push(race)
        tournament.updatedAt = now
        return race.id
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to add race:', error)
        return null
      }
    },

    async updateRace(tournamentId: string, raceId: string, updates: Race): Promise<void> {
      const tournament = this.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return
      const index = tournament.races.findIndex((race) => race.id === raceId)
      if (index === -1) return

      const now = new Date().toISOString()

      try {
        const { error } = await supabase
          .from('races')
          .update({
            timestamp: updates.timestamp,
            track: updates.track,
            placements: updates.placements,
            notes: updates.notes || null,
            status: updates.status || null,
            rank_by_player: updates.rankByPlayer || null,
            manual_points: updates.manualPoints || null,
            blue_shells: updates.blueShells || null,
          })
          .eq('id', raceId)

        if (error) throw error

        // Update tournament updated_at
        await supabase
          .from('tournaments')
          .update({ updated_at: now })
          .eq('id', tournamentId)

        tournament.races[index] = { ...updates }
        tournament.updatedAt = now
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to update race:', error)
      }
    },

    async deleteRace(tournamentId: string, raceId: string): Promise<void> {
      const tournament = this.tournaments.find((item) => item.id === tournamentId)
      if (!tournament) return

      const now = new Date().toISOString()

      try {
        const { error } = await supabase.from('races').delete().eq('id', raceId)

        if (error) throw error

        // Update tournament updated_at
        await supabase
          .from('tournaments')
          .update({ updated_at: now })
          .eq('id', tournamentId)

        tournament.races = tournament.races.filter((race) => race.id !== raceId)
        tournament.updatedAt = now
      } catch (error: any) {
        this.error = error.message
        console.error('Failed to delete race:', error)
      }
    },

    replaceAllData(data: AppData): void {
      this.tournaments = data.tournaments
    },

    mergeData(data: AppData): void {
      data.tournaments.forEach((incoming) => {
        const existing = this.tournaments.find((item) => item.id === incoming.id)
        if (!existing) {
          this.tournaments.push(incoming)
          return
        }

        existing.name = incoming.name
        existing.settings = incoming.settings
        existing.updatedAt = new Date().toISOString()

        existing.players = mergeById(existing.players, incoming.players)
        existing.races = mergeById(existing.races, incoming.races)
      })
    },
  },
})

function mergeById<T extends { id: string }>(target: T[], incoming: T[]): T[] {
  const map = new Map(target.map((item) => [item.id, item]))
  incoming.forEach((item) => {
    map.set(item.id, item)
  })
  return [...map.values()]
}
