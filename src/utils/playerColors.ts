/**
 * Per-player identity colours for the Beeriokart bracket flow.
 *
 * Every real player gets a stable colour from the palette (assigned by their
 * order in the tournament roster), so the same person is the same colour in
 * every race card, connector line and legend chip. Jokers share one neutral
 * slate colour since they are placeholders, not people.
 */

export interface PlayerColor {
  /** Solid colour – used for dots, chips and connector strokes. */
  hex: string
  /** Translucent version – used for row backgrounds. */
  soft: string
  /** Text colour that reads on top of `hex`. */
  contrast: string
}

// 16 hand-picked hues, ordered so neighbouring roster slots never sit next to
// each other on the colour wheel.
const PALETTE = [
  '#E11D48', // rose
  '#2563EB', // blue
  '#16A34A', // green
  '#F59E0B', // amber
  '#9333EA', // purple
  '#06B6D4', // cyan
  '#DB2777', // pink
  '#84CC16', // lime
  '#4338CA', // indigo
  '#B45309', // brown
  '#0F766E', // teal
  '#EF4444', // red
  '#A855F7', // violet
  '#0EA5E9', // sky
  '#65A30D', // olive
  '#78716C', // stone
]

const JOKER_HEX = '#94A3B8'

export const JOKER_COLOR: PlayerColor = {
  hex: JOKER_HEX,
  soft: `${JOKER_HEX}24`,
  contrast: '#0F172A',
}

export const isJokerId = (id: string | null | undefined): boolean =>
  Boolean(id?.startsWith('joker_'))

/** Relative luminance check so light palette entries keep dark text. */
const contrastFor = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return luminance > 0.5 ? '#0F172A' : '#FFFFFF'
}

const makeColor = (hex: string): PlayerColor => ({
  hex,
  soft: `${hex}24`,
  contrast: contrastFor(hex),
})

/**
 * Builds the id → colour map. Jokers are skipped when handing out palette
 * entries so that adding a joker never shifts the real players' colours.
 */
export const buildPlayerColors = (
  players: Array<{ id: string }>,
): Record<string, PlayerColor> => {
  const map: Record<string, PlayerColor> = {}
  let next = 0

  for (const player of players) {
    if (isJokerId(player.id)) {
      map[player.id] = JOKER_COLOR
      continue
    }
    map[player.id] = makeColor(PALETTE[next % PALETTE.length])
    next++
  }

  return map
}

/** Up to two letters for compact avatar chips. */
export const playerInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
