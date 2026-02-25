import type { ID, Race, RaceStatus, Tournament } from '@/types'

export type PointsMap = Record<ID, number>

export function computeRacePoints(tournament: Tournament, race: Race): PointsMap {
  const pointsByPlacement = tournament.settings.pointsByPlacement
  const placements = race.placements
  const statusMap = race.status ?? {}
  const manualPoints = race.manualPoints ?? {}

  const rankMap: Record<ID, number> = {}
  if (race.rankByPlayer) {
    Object.entries(race.rankByPlayer).forEach(([playerId, rank]) => {
      if (Number.isFinite(rank) && rank > 0) {
        rankMap[playerId] = rank
      }
    })
  }

  placements.forEach((playerId, index) => {
    if (!rankMap[playerId]) {
      rankMap[playerId] = index + 1
    }
  })

  const points: PointsMap = {}

  placements.forEach((playerId) => {
    const status = getStatus(statusMap, playerId)
    if (status !== 'ok') {
      points[playerId] = 0
    }
  })

  const groups = buildTieGroups(placements, rankMap, statusMap)
  for (const group of groups) {
    const tiedPlayers = group.players
    const missingManual = tiedPlayers.filter((playerId) => manualPoints[playerId] === undefined)

    if (missingManual.length === 0) {
      tiedPlayers.forEach((playerId) => {
        points[playerId] = Number(manualPoints[playerId])
      })
      continue
    }

    const fallbackValue =
      group.players.length > 1
        ? calculateAverage(pointsByPlacement, group.rank, group.players.length)
        : calculateBasePoints(pointsByPlacement, group.rank)

    tiedPlayers.forEach((playerId) => {
      if (manualPoints[playerId] !== undefined) {
        points[playerId] = Number(manualPoints[playerId])
      } else {
        points[playerId] = fallbackValue
      }
    })
  }

  return points
}

function buildTieGroups(
  placements: ID[],
  rankMap: Record<ID, number>,
  statusMap: Record<ID, RaceStatus>,
): Array<{ rank: number; players: ID[] }> {
  const groups: Record<number, ID[]> = {}

  placements.forEach((playerId) => {
    const status = getStatus(statusMap, playerId)
    if (status !== 'ok') return

    const rank = rankMap[playerId]
    if (!rank) return

    if (!groups[rank]) {
      groups[rank] = []
    }
    groups[rank].push(playerId)
  })

  return Object.entries(groups)
    .map(([rank, players]) => ({ rank: Number(rank), players }))
    .sort((a, b) => a.rank - b.rank)
}

function getStatus(statusMap: Record<ID, RaceStatus>, playerId: ID): RaceStatus {
  return statusMap[playerId] ?? 'ok'
}

function calculateBasePoints(pointsByPlacement: number[], rank: number): number {
  const value = pointsByPlacement[rank - 1]
  return Number.isFinite(value) ? value : 0
}

function calculateAverage(pointsByPlacement: number[], rank: number, size: number): number {
  let total = 0
  for (let offset = 0; offset < size; offset += 1) {
    total += pointsByPlacement[rank - 1 + offset] ?? 0
  }
  const average = total / size
  return Math.round(average * 100) / 100
}
