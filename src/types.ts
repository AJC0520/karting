export type ID = string

export type AppData = {
  tournaments: Tournament[]
}

export type Tournament = {
  id: ID
  name: string
  createdAt: string
  updatedAt: string
  settings: TournamentSettings
  players: Player[]
  races: Race[]
}

export type TournamentSettings = {
  initialPoints: number
  pointsByPlacement: number[]
  tieHandling: 'split' | 'manual'
  blueShellBonus?: boolean
}

export type Player = {
  id: ID
  name: string
  nickname?: string
  createdAt: string
  archived: boolean
  initialPoints?: number
}

export type RaceStatus = 'ok' | 'dnf' | 'dq'

export type Race = {
  id: ID
  tournamentId: ID
  timestamp: string
  track: string
  placements: ID[]
  notes?: string
  status?: Record<ID, RaceStatus>
  rankByPlayer?: Record<ID, number>
  manualPoints?: Record<ID, number>
  blueShells?: ID[] // Players who got hit by blue shell but still won
}

export type StoredSchemaV1 = {
  version: 1
  updatedAt: string
  data: AppData
}

export type StoredSchema = StoredSchemaV1
