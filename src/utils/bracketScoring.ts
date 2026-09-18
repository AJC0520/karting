/**
 * Hidden points system for the Beeriokart bracket.
 *
 * Every completed race hands out points by finishing position, scaled by how
 * much that round is worth, and those points decide the order within each
 * elimination tier below (see `computeBracketStandings`). Nothing here is
 * shown until the tournament ends; it is computed from the same race and
 * placement data the bracket already tracks.
 */

import { isJokerId } from './playerColors'

/** Points for 1st, 2nd, 3rd, 4th in any single race. */
const POSITION_POINTS = [10, 7, 5, 3]

/**
 * How much a round's races count toward the total. Later rounds carry more
 * weight because a good result there is harder to get - so among players who
 * were knocked out at the same stage, the one who raced better along the way
 * ranks higher.
 */
const ROUND_WEIGHT: Record<string, number> = {
  'Winner bracket 1': 1,
  'Loser bracket 1': 1,
  'Winner bracket 2': 1.5,
  'Loser bracket 2': 1.5,
  'Winner bracket finale': 2,
  'Qual finale': 2,
  Consolation: 2,
  'Grand finale': 3,
}

/** Chronological order, used to sort a player's race-by-race breakdown. */
export const ROUND_ORDER = [
  'Winner bracket 1',
  'Loser bracket 1',
  'Winner bracket 2',
  'Loser bracket 2',
  'Winner bracket finale',
  'Qual finale',
  'Consolation',
  'Grand finale',
]

export interface ScoredRace {
  round: string
  position: number
  points: number
}

export interface BracketStanding {
  playerId: string
  totalPoints: number
  races: ScoredRace[]
  /** True 1-based tournament placement, exactly as the bracket decided it. */
  placement: number
}

interface BracketRaceLike {
  round: string
  placements: string[]
  completed: boolean
}

/**
 * Ranks every real (non-joker) player by where the bracket actually put
 * them, using the hidden points only to break ties within that result.
 *
 * The bracket doesn't eliminate players in round order - it eliminates them
 * in *depth* order, and depth is not the same as which round's name sounds
 * later:
 *  - Grand finale entrants (1st-4th) are the true top 4.
 *  - Qual finale rejects (3rd/4th there) went out one step from the final -
 *    the deepest anyone can be cut.
 *  - Loser bracket 2 rejects (2nd-4th there) went out one round earlier.
 *  - Loser bracket 1 rejects went out earliest of anyone still racing -
 *    Consolation only ranks *them* against each other, so despite its name
 *    it decides the bottom of the table, not 5th-8th.
 */
export function computeBracketStandings(
  races: BracketRaceLike[],
  playerIds: string[],
): BracketStanding[] {
  const completedByRound = new Map<string, BracketRaceLike[]>()
  for (const race of races) {
    if (!race.completed || !race.placements.length) continue
    const list = completedByRound.get(race.round) ?? []
    list.push(race)
    completedByRound.set(race.round, list)
  }

  const points = new Map<string, number>()
  const scoredRaces = new Map<string, ScoredRace[]>()

  for (const playerId of playerIds) {
    if (isJokerId(playerId)) continue
    points.set(playerId, 0)
    scoredRaces.set(playerId, [])
  }

  for (const race of races) {
    if (!race.completed || !race.placements.length) continue
    const weight = ROUND_WEIGHT[race.round] ?? 1

    race.placements.forEach((playerId, index) => {
      if (!points.has(playerId)) return
      const raceScore = (POSITION_POINTS[index] ?? 0) * weight
      points.set(playerId, (points.get(playerId) ?? 0) + raceScore)
      scoredRaces.get(playerId)!.push({ round: race.round, position: index + 1, points: raceScore })
    })
  }

  const grandFinale = completedByRound.get('Grand finale')?.[0]
  const qualFinale = completedByRound.get('Qual finale')?.[0]
  const loserBracket2 = completedByRound.get('Loser bracket 2') ?? []
  const loserBracket1 = completedByRound.get('Loser bracket 1') ?? []
  const consolationRank = new Map<string, number>()
  completedByRound.get('Consolation')?.[0]?.placements.forEach((id, i) => consolationRank.set(id, i + 1))

  interface Ranked {
    playerId: string
    /** Lower = further into the tournament before being decided/knocked out. */
    tier: number
    withinTier: number
  }
  const ranked: Ranked[] = []

  for (const playerId of points.keys()) {
    const gfPos = grandFinale?.placements.indexOf(playerId)
    if (gfPos !== undefined && gfPos !== -1) {
      ranked.push({ playerId, tier: 0, withinTier: gfPos + 1 })
      continue
    }

    const qualPos = qualFinale?.placements.indexOf(playerId)
    if (qualPos !== undefined && qualPos !== -1 && qualPos >= 2) {
      ranked.push({ playerId, tier: 1, withinTier: qualPos + 1 })
      continue
    }

    const l2 = loserBracket2.find(r => r.placements.includes(playerId))
    const l2Pos = l2 ? l2.placements.indexOf(playerId) : -1
    if (l2 && l2Pos >= 1) {
      ranked.push({ playerId, tier: 2, withinTier: l2Pos + 1 })
      continue
    }

    const l1 = loserBracket1.find(r => r.placements.includes(playerId))
    const l1Pos = l1 ? l1.placements.indexOf(playerId) : -1
    if (l1 && l1Pos >= 2) {
      // Consolation, if it was played, settles the order within this tier.
      ranked.push({ playerId, tier: 3, withinTier: consolationRank.get(playerId) ?? l1Pos + 1 })
      continue
    }

    // Tournament isn't finished, or this player's fate isn't resolved yet -
    // park them at the back, ordered by points as a placeholder.
    ranked.push({ playerId, tier: 99, withinTier: 0 })
  }

  ranked.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    if (a.withinTier !== b.withinTier) return a.withinTier - b.withinTier
    return (points.get(b.playerId) ?? 0) - (points.get(a.playerId) ?? 0)
  })

  return ranked.map((entry, index) => ({
    playerId: entry.playerId,
    totalPoints: points.get(entry.playerId) ?? 0,
    races: (scoredRaces.get(entry.playerId) ?? [])
      .slice()
      .sort((a, b) => ROUND_ORDER.indexOf(a.round) - ROUND_ORDER.indexOf(b.round)),
    placement: index + 1,
  }))
}
