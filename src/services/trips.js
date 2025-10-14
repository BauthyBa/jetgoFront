import { api } from './api'

// Map backend trip payloads (supports multiple shapes) to a unified model
export function normalizeTrip(raw) {
  if (!raw) return null
  const name = raw.name || raw.destination || 'Viaje'
  const destination = raw.destination || raw.name || null
  const origin = raw.origin || raw.country || null
  const startDate = raw.start_date || raw.date || null
  const endDate = raw.end_date || null
  const budgetMin = raw.budget_min ?? raw.price_min ?? null
  const budgetMax = raw.budget_max ?? raw.price_max ?? null
  const imageUrl = raw.image_url || null
  const tags = Array.isArray(raw.tags)
    ? raw.tags
    : (typeof raw.tags === 'string' && raw.tags.length > 0 ? raw.tags.split(',').map((t) => t.trim()) : [])
  const rating = typeof raw.rating === 'number' ? raw.rating : null
  const totalRatings = typeof raw.total_ratings === 'number' ? raw.total_ratings : null
  const season = raw.season || null
  const status = raw.status || null
  const roomType = raw.room_type || null
  const maxParticipants = raw.max_participants ?? null
  const currentParticipants = raw.current_participants ?? raw.currentParticipants ?? null
  const creatorId = raw.creator_id || null
  const country = raw.country || null

  return {
    id: raw.id,
    name,
    destination,
    origin,
    startDate,
    endDate,
    budgetMin,
    budgetMax,
    imageUrl,
    tags,
    rating,
    totalRatings,
    season,
    status,
    roomType,
    maxParticipants,
    currentParticipants,
    creatorId,
    country,
    raw,
  }
}

export async function listTrips() {
  const { data } = await api.get('/trips/list/')
  const trips = Array.isArray(data?.trips) ? data.trips : []
  return trips.map(normalizeTrip).filter(Boolean)
}

export async function getUserParticipatingTrips() {
  const { data } = await api.get('/trips/my-participating/')
  const trips = Array.isArray(data?.trips) ? data.trips : []
  return trips.map(normalizeTrip).filter(Boolean)
}

export async function joinTrip(tripId, userId) {
  const { data } = await api.post('/trips/join/', { trip_id: tripId, user_id: userId })
  return data
}

export async function leaveTrip(tripId, userId) {
  const { data } = await api.post('/trips/leave/', { trip_id: tripId, user_id: userId })
  return data
}


// Create trip
export async function createTrip(payload) {
  const { data } = await api.post('/trips/create/', payload)
  return data
}

// Update trip (frontend expects backend endpoint to exist; if not, caller should handle 404)
export async function updateTrip(payload) {
  const { data } = await api.post('/trips/update/', payload)
  return data
}


