export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  const now = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 9)
  return `${now}-${rand}`
}
