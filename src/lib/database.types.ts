export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          created_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
          initial_points: number
          points_by_placement: Json
          tie_handling: string
          blue_shell_bonus: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
          initial_points: number
          points_by_placement: Json
          tie_handling: string
          blue_shell_bonus?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          updated_at?: string
          initial_points?: number
          points_by_placement?: Json
          tie_handling?: string
          blue_shell_bonus?: boolean | null
        }
      }
      players: {
        Row: {
          id: string
          tournament_id: string
          name: string
          nickname: string | null
          created_at: string
          archived: boolean
          initial_points: number | null
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          nickname?: string | null
          created_at: string
          archived?: boolean
          initial_points?: number | null
        }
        Update: {
          id?: string
          tournament_id?: string
          name?: string
          nickname?: string | null
          created_at?: string
          archived?: boolean
          initial_points?: number | null
        }
      }
      races: {
        Row: {
          id: string
          tournament_id: string
          timestamp: string
          track: string
          placements: Json
          notes: string | null
          status: Json | null
          rank_by_player: Json | null
          manual_points: Json | null
          blue_shells: Json | null
        }
        Insert: {
          id?: string
          tournament_id: string
          timestamp: string
          track: string
          placements: Json
          notes?: string | null
          status?: Json | null
          rank_by_player?: Json | null
          manual_points?: Json | null
          blue_shells?: Json | null
        }
        Update: {
          id?: string
          tournament_id?: string
          timestamp?: string
          track?: string
          placements?: Json
          notes?: string | null
          status?: Json | null
          rank_by_player?: Json | null
          manual_points?: Json | null
          blue_shells?: Json | null
        }
      }
    }
  }
}
