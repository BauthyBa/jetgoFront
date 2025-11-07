const toNumber = (value) => {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null
}

const resolveFromRaw = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.current_participants === 'number') return raw.current_participants
  if (typeof raw.currentParticipants === 'number') return raw.currentParticipants
  return null
}

export function resolveCurrentParticipants(trip) {
  if (!trip) return null
  const { currentParticipants, currentParticipantsBase, raw } = trip
  return (
    toNumber(currentParticipants) ??
    toNumber(currentParticipantsBase) ??
    toNumber(resolveFromRaw(raw))
  )
}

export function getParticipantStats(trip) {
  const current = resolveCurrentParticipants(trip)
  const max = toNumber(trip?.maxParticipants)
  return {
    current,
    max,
    label: `${current != null ? current : '?'} / ${max != null ? max : '?'} participantes`,
    hasCurrent: current != null,
    hasMax: max != null,
  }
}

export function getRemainingSlots(trip) {
  const { current, max } = getParticipantStats(trip)
  if (current == null || max == null) return null
  return Math.max(max - current, 0)
}

export function isTripFull(trip) {
  const { current, max } = getParticipantStats(trip)
  if (current == null || max == null) return false
  return current >= max
}
