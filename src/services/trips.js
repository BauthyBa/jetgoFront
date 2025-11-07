import { api } from './api'
import { supabase } from './supabase'
import { mapTransportTypeForUi } from '@/utils/transport'

// Map backend trip payloads (supports multiple shapes) to a unified model
export function normalizeTrip(raw) {
  if (!raw) return null
  const name = raw.name || raw.destination || 'Viaje'
  const destination = raw.destination || raw.name || null
  const origin = raw.origin || raw.country || null
  const description = raw.description || raw.desc || null
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
  const transportTypeRaw = raw.transport_type || raw.tipo || null
  const transportType = mapTransportTypeForUi(transportTypeRaw)
  const maxParticipants = raw.max_participants ?? null
  const baseCurrentParticipants = raw.current_participants ?? raw.currentParticipants ?? null
  const currentParticipants = baseCurrentParticipants
  const creatorId = raw.creator_id || null
  const country = raw.country || null
  const createdAt = raw.created_at || raw.createdAt || raw.created || raw.created_on || null
  const updatedAt = raw.updated_at || raw.updatedAt || raw.updated || raw.updated_on || null

  // El ID puede venir como 'id' o 'trip_id'
  const id = raw.id || raw.trip_id || null

  return {
    id,
    name,
    destination,
    origin,
    description,
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
    transportType,
    transportTypeRaw,
    tipo: transportType,
    maxParticipants,
    currentParticipants,
    currentParticipantsBase: baseCurrentParticipants,
    creatorId,
    country,
    createdAt,
    updatedAt,
    raw,
  }
}

export async function listTrips() {
  const { data } = await api.get('/trips/list/')
  const trips = Array.isArray(data?.trips) ? data.trips : []
  const normalized = trips.map(normalizeTrip).filter(Boolean)
  return await withChatParticipants(normalized)
}

export async function getUserParticipatingTrips() {
  const { data } = await api.get('/trips/my-participating/')
  const trips = Array.isArray(data?.trips) ? data.trips : []
  const normalized = trips.map(normalizeTrip).filter(Boolean)
  return await withChatParticipants(normalized)
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
export async function updateTrip(tripId, payload) {
  // El backend espera 'id' y 'creator_id', no 'trip_id'
  const { data } = await api.post('/trips/update/', { 
    id: tripId,
    ...payload 
  })
  return data
}

// Delete trip
export async function deleteTrip(tripId) {
  const { data } = await api.post('/trips/delete/', { trip_id: tripId })
  return data
}

async function withChatParticipants(trips) {
  const ids = trips.map((t) => t?.id).filter(Boolean)
  if (ids.length === 0) return trips
  const counts = await fetchChatParticipantCounts(ids)
  if (!counts || Object.keys(counts).length === 0) return trips
  return trips.map((trip) => {
    const key = String(trip?.id)
    const chatCount = counts[key]
    if (chatCount == null) return trip
    return {
      ...trip,
      currentParticipants: chatCount,
    }
  })
}

async function fetchChatParticipantCounts(tripIds) {
  try {
    const uniqueTripIds = Array.from(new Set(
      (tripIds || []).map((id) => (id != null ? String(id) : '')).filter(Boolean)
    ))
    if (uniqueTripIds.length === 0) return {}

    const { data: rooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select('id, trip_id')
      .in('trip_id', uniqueTripIds)
      .eq('is_group', true)

    if (roomsError || !rooms || rooms.length === 0) return {}
    const roomIds = rooms.map((room) => room?.id).filter(Boolean)
    if (roomIds.length === 0) return {}

    const countsByTrip = {}
    const membersCountPromises = rooms.map(async (room) => {
      const roomId = room?.id
      const tripId = room?.trip_id
      if (!roomId || !tripId) return null
      const count = await fetchRoomMemberCount(roomId)
      if (count == null) return null
      return { tripId: String(tripId), count }
    })

    const membersCounts = await Promise.all(membersCountPromises)
    for (const item of membersCounts) {
      if (!item) continue
      const existing = countsByTrip[item.tripId]
      countsByTrip[item.tripId] = existing == null ? item.count : Math.max(existing, item.count)
    }

    return countsByTrip
  } catch (error) {
    console.error('Error obteniendo integrantes desde chat:', error)
    return {}
  }
}

async function fetchRoomMemberCount(roomId) {
  try {
    const response = await api.get('/chat-members/', { params: { room_id: roomId } })
    const members = Array.isArray(response?.data?.members) ? response.data.members : []
    if (members.length === 0) return 0
    const uniqueIds = new Set(members.map((member) => String(member?.user_id || '')).filter(Boolean))
    return uniqueIds.size
  } catch (error) {
    console.error(`Error obteniendo miembros del room ${roomId}:`, error)
    return null
  }
}
