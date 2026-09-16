/**
 * Presentation rules for a bracket race result: what a finishing position
 * means in a given round, and how it should be coloured and labelled.
 */

export const getPositionColor = (round: string, position: number): string => {
  // Grand finale: Gold, Silver, Bronze, White
  if (round === 'Grand finale') {
    if (position === 1) return 'bg-yellow-400 text-yellow-950 border-yellow-500'
    if (position === 2) return 'bg-gray-300 text-gray-900 border-gray-400'
    if (position === 3) return 'bg-orange-400 text-orange-950 border-orange-500'
    return 'bg-white text-ink border-gray-300'
  }

  // Loser bracket 1: Top 2 advance (yellow - not safe yet), bottom 2 go to consolation (red)
  if (round === 'Loser bracket 1') {
    return position <= 2 ? 'bg-yellow-100 text-yellow-900 border-yellow-300' : 'bg-red-100 text-red-900 border-red-300'
  }

  // Loser bracket 2: Only 1st advances (yellow - not safe yet), rest eliminated (red)
  if (round === 'Loser bracket 2') {
    return position === 1 ? 'bg-yellow-100 text-yellow-900 border-yellow-300' : 'bg-red-100 text-red-900 border-red-300'
  }

  // Qual finale: Top 2 advance to grand finale (green), bottom 2 eliminated (red)
  if (round === 'Qual finale') {
    return position <= 2 ? 'bg-green-100 text-green-900 border-green-300' : 'bg-red-100 text-red-900 border-red-300'
  }

  // Winner bracket 1 & 2: Top 2 advance (green), 3rd-4th go to loser bracket (yellow)
  if (round === 'Winner bracket 1' || round === 'Winner bracket 2') {
    return position <= 2 ? 'bg-green-100 text-green-900 border-green-300' : 'bg-yellow-100 text-yellow-900 border-yellow-300'
  }

  // Winner bracket finale: Top 2 advance (green), 3rd-4th go to qual finale (yellow)
  if (round === 'Winner bracket finale') {
    return position <= 2 ? 'bg-green-100 text-green-900 border-green-300' : 'bg-yellow-100 text-yellow-900 border-yellow-300'
  }

  // Consolation: Determining 5-8th place among already eliminated players
  if (round === 'Consolation') {
    return 'bg-slate-100 text-slate-900 border-slate-300'
  }

  return 'bg-white text-ink border-gray-300'
}

/**
 * Where a finishing position actually sends the driver. Replaces the old
 * arrow/cross icons with a short badge that says it in words.
 *
 * `tone` drives the badge colour: adv = safe, drop = still alive but demoted,
 * final = through to a decider, out = tournament over, none = nothing to say.
 */
export type OutcomeTone = 'adv' | 'drop' | 'final' | 'out' | 'none'

export interface RaceOutcome {
  label: string
  tone: OutcomeTone
}

/**
 * Tone -> badge class. Spelled out literally rather than built as
 * `mk-outcome-${tone}`, because Tailwind tree-shakes @layer components rules
 * whose class name never appears verbatim in a scanned file.
 */
export const OUTCOME_CLASS: Record<OutcomeTone, string> = {
  adv: 'mk-outcome-adv',
  drop: 'mk-outcome-drop',
  final: 'mk-outcome-final',
  out: 'mk-outcome-out',
  none: 'mk-outcome-none',
}

const NO_OUTCOME: RaceOutcome = { label: '', tone: 'none' }

export const getOutcome = (round: string, position: number): RaceOutcome => {
  // The grand finale is the result itself - show the final standing.
  if (round === 'Grand finale') {
    return { label: ['1st', '2nd', '3rd', '4th'][position - 1] ?? '', tone: 'final' }
  }

  // Consolation decides 5th through 8th among drivers already knocked out.
  if (round === 'Consolation') {
    return { label: `${position + 4}th`, tone: 'none' }
  }

  if (round === 'Winner bracket 1' || round === 'Winner bracket 2') {
    return position <= 2
      ? { label: 'Advances', tone: 'adv' }
      : { label: 'Loser bkt', tone: 'drop' }
  }

  if (round === 'Winner bracket finale') {
    return position <= 2
      ? { label: 'Grand final', tone: 'final' }
      : { label: 'Qual final', tone: 'drop' }
  }

  if (round === 'Loser bracket 1') {
    return position <= 2
      ? { label: 'Advances', tone: 'adv' }
      : { label: 'Consolation', tone: 'out' }
  }

  if (round === 'Loser bracket 2') {
    return position === 1
      ? { label: 'Advances', tone: 'adv' }
      : { label: 'Out', tone: 'out' }
  }

  if (round === 'Qual finale') {
    return position <= 2
      ? { label: 'Grand final', tone: 'final' }
      : { label: 'Out', tone: 'out' }
  }

  return NO_OUTCOME
}

/** Finishing here ends the driver's tournament - used for the dead-end markers. */
export const isElimination = (round: string, position: number): boolean =>
  getOutcome(round, position).tone === 'out'
