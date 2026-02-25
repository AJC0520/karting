import type { TournamentSettings } from '@/types'

export const DEFAULT_POINTS = [15, 12, 10, 9, 9, 8, 8, 7, 7, 6, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 1]

export const TRACKS = [
  'Acorn Heights',
  'Airship Fortress',
  'Boo Cinema',
  "Bowser's Castle",
  'Cheep Cheep Falls',
  'Choco Mountain',
  'Crown City',
  'Dandelion Depths',
  'Desert Hills',
  'Dino Dino Jungle',
  'DK Pass',
  'DK Spaceport',
  'Dry Bones Burnout',
  'Faraway Oasis',
  'Great ? Block Ruins',
  'Koopa Troopa Beach',
  'Mario Bros. Circuit',
  'Mario Circuit',
  'Moo Moo Meadows',
  'Peach Beach',
  'Peach Stadium',
  'Rainbow Road',
  'Salty Salty Speedway',
  'Shy Guy Bazaar',
  'Sky-High Sundae',
  'Starview Peak',
  "Toad's Factory",
  'Wario Stadium',
  "Wario's Galleon",
  'Whistlestop Summit',
]

export const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = {
  initialPoints: 0,
  pointsByPlacement: DEFAULT_POINTS,
  tieHandling: 'split',
}

export function defaultTournamentSettings(): TournamentSettings {
  return {
    initialPoints: DEFAULT_TOURNAMENT_SETTINGS.initialPoints,
    pointsByPlacement: [...DEFAULT_POINTS],
    tieHandling: DEFAULT_TOURNAMENT_SETTINGS.tieHandling,
  }
}
