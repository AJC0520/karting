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
      bracket_tournaments: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          completed: boolean
          players: Json
          current_round: string | null
          /** When the tournament is (or was) actually played - separate from
           *  `created_at`, which is just when the row was inserted. Lets a
           *  tournament be scheduled ahead of time (countdown on /online) or
           *  backdated to log one that already happened. Null on rows from
           *  before this existed. */
          event_date: string | null
          /** False for a roster-only draft saved with fewer than 12 players -
           *  no races exist yet and it's hidden from /online. Defaults true
           *  so every pre-existing tournament (all of which already had
           *  races) is unaffected. */
          started: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          completed?: boolean
          players: Json
          current_round?: string | null
          event_date?: string | null
          started?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
          completed?: boolean
          players?: Json
          current_round?: string | null
          event_date?: string | null
          started?: boolean
        }
      }
      bracket_races: {
        Row: {
          id: string
          tournament_id: string
          round: string
          race_number: number
          players: Json
          placements: Json | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round: string
          race_number: number
          players: Json
          placements?: Json | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          round?: string
          race_number?: number
          players?: Json
          placements?: Json | null
          completed?: boolean
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
    Functions: {
      /**
       * SECURITY DEFINER functions backing the public /online page - they
       * only ever return Trikom's own rows, so exposing them to anon/public
       * doesn't require relaxing RLS on the underlying tables.
       */
      get_trikom_tournaments: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['bracket_tournaments']['Row'][]
      }
      /** p_tournament_id is `text`, matching bracket_races.tournament_id - the
       *  app generates its own ids client-side rather than using a native
       *  `uuid` column. */
      get_trikom_races: {
        Args: { p_tournament_id: string }
        Returns: Database['public']['Tables']['bracket_races']['Row'][]
      }
    }
  }
}
