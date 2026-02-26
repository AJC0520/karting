import type { ID, Player, Race, Tournament } from '@/types'
import { computeRacePoints } from './scoring'

export type LeaderboardEntry = {
  player: Player
  totalPoints: number
  lastRacePoints: number
  gapToLeader: number
  rank: number
  avgPointsPerRace: number
  totalRaces: number
}

export type PlayerFormEntry = {
  raceId: ID
  timestamp: string
  finish: number
  points: number
}

export type PlayerStats = {
  wins: number
  podiums: number
  avgFinish: number
  bestFinish: number
  worstFinish: number
  totalRaces: number
  recentForm: PlayerFormEntry[]
  currentWinStreak: number
  longestWinStreak: number
}

export type TournamentStats = {
  totalRaces: number
  mostPlayedTrack?: { track: string; count: number }
  closestRace?: { raceId: ID; track: string; timestamp: string; spread: number }
  winRates: Array<{ player: Player; wins: number; total: number; rate: number }>
  streaks: Array<{ player: Player; current: number; longest: number }>
  mostConsistent?: { player: Player; gap: number }
  podiumKing?: { player: Player; percentage: number; podiums: number; total: number }
  avgPointsPerRace?: { player: Player; avgPoints: number }
  biggestComeback?: { player: Player; improvement: number; firstAvg: number; lastAvg: number }
  trackMaster?: { player: Player; track: string; avgFinish: number }
  uniqueTracks: number
  mostImproved?: { player: Player; improvement: number }
  blueShellVictim?: { player: Player; secondPlaces: number; total: number }
}

export function getLeaderboard(tournament: Tournament): LeaderboardEntry[] {
  const races = getRacesSorted(tournament)
  const lastRace = races[races.length - 1]
  const pointsByRace = buildRacePointsMap(tournament, races)

  const entries = tournament.players.map((player) => {
    const initialPoints = player.initialPoints ?? tournament.settings.initialPoints
    let total = initialPoints
    let totalRacePoints = 0
    let racesParticipated = 0

    races.forEach((race) => {
      const points = pointsByRace.get(race.id)?.[player.id] ?? 0
      if (race.placements.includes(player.id)) {
        totalRacePoints += points
        racesParticipated += 1
      }
      total += points
    })

    const lastRacePoints = lastRace ? pointsByRace.get(lastRace.id)?.[player.id] ?? 0 : 0
    const avgPointsPerRace = racesParticipated > 0 ? totalRacePoints / racesParticipated : 0

    return {
      player,
      totalPoints: total,
      lastRacePoints,
      gapToLeader: 0,
      rank: 0,
      avgPointsPerRace,
      totalRaces: racesParticipated,
    }
  })

  entries.sort((a, b) => b.totalPoints - a.totalPoints)
  const leader = entries[0]?.totalPoints ?? 0

  entries.forEach((entry, index) => {
    entry.rank = index + 1
    entry.gapToLeader = leader - entry.totalPoints
  })

  return entries
}

export function getPlayerStats(tournament: Tournament, playerId: ID): PlayerStats {
  const races = getRacesSorted(tournament)
  const pointsByRace = buildRacePointsMap(tournament, races)

  let wins = 0
  let podiums = 0
  let totalRaces = 0
  let totalFinish = 0
  let bestFinish = Number.POSITIVE_INFINITY
  let worstFinish = 0

  const recentForm: PlayerFormEntry[] = []

  races.forEach((race) => {
    const finish = getPlayerFinish(race, playerId)
    if (!finish) return

    totalRaces += 1
    totalFinish += finish.rank
    bestFinish = Math.min(bestFinish, finish.rank)
    worstFinish = Math.max(worstFinish, finish.rank)

    if (finish.rank === 1 && finish.status === 'ok') {
      wins += 1
    }
    if (finish.rank <= 3 && finish.status === 'ok') {
      podiums += 1
    }
  })

  const recentRaces = [...races]
    .filter((race) => race.placements.includes(playerId))
    .sort((a, b) => toTime(b.timestamp) - toTime(a.timestamp))
    .slice(0, 5)

  recentRaces.forEach((race) => {
    const finish = getPlayerFinish(race, playerId)
    if (!finish) return

    recentForm.push({
      raceId: race.id,
      timestamp: race.timestamp,
      finish: finish.rank,
      points: pointsByRace.get(race.id)?.[playerId] ?? 0,
    })
  })

  const { current, longest } = getWinStreaks(races, playerId)

  return {
    wins,
    podiums,
    avgFinish: totalRaces ? totalFinish / totalRaces : 0,
    bestFinish: Number.isFinite(bestFinish) ? bestFinish : 0,
    worstFinish,
    totalRaces,
    recentForm,
    currentWinStreak: current,
    longestWinStreak: longest,
  }
}

export function getTournamentStats(tournament: Tournament): TournamentStats {
  const races = getRacesSorted(tournament)
  const pointsByRace = buildRacePointsMap(tournament, races)

  const trackCounts = new Map<string, { track: string; count: number }>()
  let closestRace: TournamentStats['closestRace']

  races.forEach((race) => {
    const key = race.track.trim().toLowerCase() || 'unknown'
    const entry = trackCounts.get(key) ?? { track: race.track || 'Unknown track', count: 0 }
    entry.count += 1
    trackCounts.set(key, entry)

    const points = pointsByRace.get(race.id)
    if (points) {
      const values = Object.values(points)
      if (values.length) {
        const spread = Math.max(...values) - Math.min(...values)
        if (!closestRace || spread < closestRace.spread) {
          closestRace = {
            raceId: race.id,
            track: race.track,
            timestamp: race.timestamp,
            spread,
          }
        }
      }
    }
  })

  const mostPlayedTrack = [...trackCounts.values()].sort((a, b) => b.count - a.count)[0]

  const winRates = tournament.players.map((player) => {
    const stats = getPlayerStats(tournament, player.id)
    const total = stats.totalRaces
    const wins = stats.wins
    return {
      player,
      wins,
      total,
      rate: total ? wins / total : 0,
    }
  })

  const streaks = tournament.players.map((player) => {
    const { current, longest } = getWinStreaks(races, player.id)
    return {
      player,
      current,
      longest,
    }
  })

  // Most consistent player (smallest gap between best and worst finish)
  let mostConsistent: TournamentStats['mostConsistent']
  tournament.players.forEach((player) => {
    const stats = getPlayerStats(tournament, player.id)
    if (stats.totalRaces < 3) return // Need at least 3 races
    const gap = stats.worstFinish - stats.bestFinish
    if (!mostConsistent || gap < mostConsistent.gap) {
      mostConsistent = { player, gap }
    }
  })

  // Podium king (highest percentage of podium finishes)
  let podiumKing: TournamentStats['podiumKing']
  tournament.players.forEach((player) => {
    const stats = getPlayerStats(tournament, player.id)
    if (stats.totalRaces < 3) return // Need at least 3 races
    const percentage = (stats.podiums / stats.totalRaces) * 100
    if (!podiumKing || percentage > podiumKing.percentage) {
      podiumKing = { player, percentage, podiums: stats.podiums, total: stats.totalRaces }
    }
  })

  // Average points per race
  let avgPointsPerRace: TournamentStats['avgPointsPerRace']
  tournament.players.forEach((player) => {
    const stats = getPlayerStats(tournament, player.id)
    if (stats.totalRaces === 0) return
    let totalPoints = 0
    races.forEach((race) => {
      if (race.placements.includes(player.id)) {
        totalPoints += pointsByRace.get(race.id)?.[player.id] ?? 0
      }
    })
    const avgPoints = totalPoints / stats.totalRaces
    if (!avgPointsPerRace || avgPoints > avgPointsPerRace.avgPoints) {
      avgPointsPerRace = { player, avgPoints }
    }
  })

  // Biggest comeback (improvement from first 5 to last 5 races)
  let biggestComeback: TournamentStats['biggestComeback']
  tournament.players.forEach((player) => {
    const playerRaces = races.filter((race) => race.placements.includes(player.id))
    if (playerRaces.length < 10) return // Need at least 10 races
    const first5 = playerRaces.slice(0, 5)
    const last5 = playerRaces.slice(-5)

    let firstTotal = 0
    first5.forEach((race) => {
      const finish = getPlayerFinish(race, player.id)
      if (finish) firstTotal += finish.rank
    })
    const firstAvg = firstTotal / first5.length

    let lastTotal = 0
    last5.forEach((race) => {
      const finish = getPlayerFinish(race, player.id)
      if (finish) lastTotal += finish.rank
    })
    const lastAvg = lastTotal / last5.length

    const improvement = firstAvg - lastAvg // Positive means improved (lower finish is better)
    if (improvement > 0 && (!biggestComeback || improvement > biggestComeback.improvement)) {
      biggestComeback = { player, improvement, firstAvg, lastAvg }
    }
  })

  // Track master (best average finish on their best track)
  let trackMaster: TournamentStats['trackMaster']
  tournament.players.forEach((player) => {
    const trackPerformance = new Map<string, { total: number; count: number }>()
    races.forEach((race) => {
      const finish = getPlayerFinish(race, player.id)
      if (!finish) return
      const key = race.track.trim().toLowerCase()
      const entry = trackPerformance.get(key) ?? { total: 0, count: 0 }
      entry.total += finish.rank
      entry.count += 1
      trackPerformance.set(key, entry)
    })

    trackPerformance.forEach((perf, trackKey) => {
      if (perf.count < 2) return // Need at least 2 races on track
      const avgFinish = perf.total / perf.count
      if (!trackMaster || avgFinish < trackMaster.avgFinish) {
        const track = races.find((r) => r.track.trim().toLowerCase() === trackKey)?.track ?? trackKey
        trackMaster = { player, track, avgFinish }
      }
    })
  })

  // Track variety
  const uniqueTracks = trackCounts.size

  // Blue Shell Victim (most 2nd place finishes)
  let blueShellVictim: TournamentStats['blueShellVictim']
  tournament.players.forEach((player) => {
    let secondPlaces = 0
    let totalRaces = 0
    races.forEach((race) => {
      const finish = getPlayerFinish(race, player.id)
      if (!finish) return
      totalRaces += 1
      if (finish.rank === 2) {
        secondPlaces += 1
      }
    })
    if (totalRaces > 0 && secondPlaces > 0) {
      if (!blueShellVictim || secondPlaces > blueShellVictim.secondPlaces) {
        blueShellVictim = { player, secondPlaces, total: totalRaces }
      }
    }
  })

  // Most improved (biggest gain in standings over last 5 races)
  let mostImproved: TournamentStats['mostImproved']
  if (races.length >= 10) {
    const midPoint = Math.floor(races.length / 2)
    const firstHalfRaces = races.slice(0, midPoint)
    const secondHalfRaces = races.slice(midPoint)

    const getStandingsAfterRaces = (racesToConsider: Race[]): Map<ID, number> => {
      const standings = new Map<ID, number>()
      tournament.players.forEach((player) => {
        const initialPoints = player.initialPoints ?? tournament.settings.initialPoints
        let total = initialPoints
        racesToConsider.forEach((race) => {
          total += pointsByRace.get(race.id)?.[player.id] ?? 0
        })
        standings.set(player.id, total)
      })
      return standings
    }

    const getRank = (standings: Map<ID, number>, playerId: ID): number => {
      const sorted = [...standings.entries()].sort((a, b) => b[1] - a[1])
      return sorted.findIndex(([id]) => id === playerId) + 1
    }

    const firstHalfStandings = getStandingsAfterRaces(firstHalfRaces)
    const secondHalfStandings = getStandingsAfterRaces(races)

    tournament.players.forEach((player) => {
      const firstRank = getRank(firstHalfStandings, player.id)
      const secondRank = getRank(secondHalfStandings, player.id)
      const improvement = firstRank - secondRank // Positive means improved
      if (improvement > 0 && (!mostImproved || improvement > mostImproved.improvement)) {
        mostImproved = { player, improvement }
      }
    })
  }

  return {
    totalRaces: races.length,
    mostPlayedTrack,
    closestRace,
    winRates,
    streaks,
    mostConsistent,
    podiumKing,
    avgPointsPerRace,
    biggestComeback,
    trackMaster,
    uniqueTracks,
    mostImproved,
    blueShellVictim,
  }
}

function buildRacePointsMap(tournament: Tournament, races: Race[]): Map<ID, Record<ID, number>> {
  const map = new Map<ID, Record<ID, number>>()
  races.forEach((race) => {
    map.set(race.id, computeRacePoints(tournament, race))
  })
  return map
}

function getRacesSorted(tournament: Tournament): Race[] {
  return [...tournament.races].sort((a, b) => toTime(a.timestamp) - toTime(b.timestamp))
}

function getPlayerFinish(race: Race, playerId: ID): { rank: number; status: 'ok' | 'dnf' | 'dq' } | null {
  if (!race.placements.includes(playerId)) return null
  const status = race.status?.[playerId] ?? 'ok'
  const rank = race.rankByPlayer?.[playerId]
  const indexRank = race.placements.indexOf(playerId) + 1
  const resolvedRank = rank && Number.isFinite(rank) ? rank : indexRank
  const finalRank = status === 'ok' ? resolvedRank : race.placements.length
  return { rank: finalRank, status }
}

function getWinStreaks(races: Race[], playerId: ID): { current: number; longest: number } {
  let longest = 0
  let current = 0
  let running = 0

  races.forEach((race) => {
    const finish = getPlayerFinish(race, playerId)
    if (!finish) return

    if (finish.rank === 1 && finish.status === 'ok') {
      running += 1
      longest = Math.max(longest, running)
    } else {
      running = 0
    }
  })

  for (let i = races.length - 1; i >= 0; i -= 1) {
    const finish = getPlayerFinish(races[i], playerId)
    if (!finish) continue
    if (finish.rank === 1 && finish.status === 'ok') {
      current += 1
    } else {
      break
    }
  }

  return { current, longest }
}

function toTime(value: string): number {
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

export type TrackStats = {
  track: string
  timesPlayed: number
  mostWins: { player: Player; wins: number } | null
  mostPoints: { player: Player; totalPoints: number } | null
  avgPointSpread: number
  lastPlayed?: string
}

export function getTrackStats(tournament: Tournament, trackName: string): TrackStats | null {
  const races = getRacesSorted(tournament).filter(
    (race) => race.track.trim().toLowerCase() === trackName.trim().toLowerCase()
  )

  if (races.length === 0) return null

  const pointsByRace = buildRacePointsMap(tournament, races)
  
  // Count wins per player
  const winsByPlayer = new Map<ID, number>()
  races.forEach((race) => {
    if (race.placements.length > 0) {
      const winnerId = race.placements[0]
      const status = race.status?.[winnerId] ?? 'ok'
      if (status === 'ok') {
        winsByPlayer.set(winnerId, (winsByPlayer.get(winnerId) ?? 0) + 1)
      }
    }
  })

  // Calculate total points per player on this track
  const pointsByPlayer = new Map<ID, number>()
  races.forEach((race) => {
    const racePoints = pointsByRace.get(race.id)
    if (racePoints) {
      Object.entries(racePoints).forEach(([playerId, points]) => {
        pointsByPlayer.set(playerId, (pointsByPlayer.get(playerId) ?? 0) + points)
      })
    }
  })

  // Find player with most wins
  let mostWins: TrackStats['mostWins'] = null
  winsByPlayer.forEach((wins, playerId) => {
    const player = tournament.players.find((p) => p.id === playerId)
    if (player && (!mostWins || wins > mostWins.wins)) {
      mostWins = { player, wins }
    }
  })

  // Find player with most points
  let mostPoints: TrackStats['mostPoints'] = null
  pointsByPlayer.forEach((totalPoints, playerId) => {
    const player = tournament.players.find((p) => p.id === playerId)
    if (player && (!mostPoints || totalPoints > mostPoints.totalPoints)) {
      mostPoints = { player, totalPoints }
    }
  })

  // Calculate average point spread
  let totalSpread = 0
  races.forEach((race) => {
    const racePoints = pointsByRace.get(race.id)
    if (racePoints) {
      const values = Object.values(racePoints)
      if (values.length > 0) {
        const spread = Math.max(...values) - Math.min(...values)
        totalSpread += spread
      }
    }
  })
  const avgPointSpread = races.length > 0 ? totalSpread / races.length : 0

  return {
    track: races[0].track,
    timesPlayed: races.length,
    mostWins,
    mostPoints,
    avgPointSpread,
    lastPlayed: races[races.length - 1]?.timestamp,
  }
}
