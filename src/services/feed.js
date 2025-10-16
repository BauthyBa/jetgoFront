import { api } from './api'

// Obtener el feed de eventos sociales
export async function getFeedEvents(filters = {}) {
  try {
    const params = new URLSearchParams()
    
    if (filters.eventType) params.append('event_type', filters.eventType)
    if (filters.userId) params.append('user_id', filters.userId)
    if (filters.tripId) params.append('trip_id', filters.tripId)
    if (filters.days) params.append('days', filters.days)
    
    const response = await api.get(`/feed/?${params.toString()}`)
    return response.data
  } catch (error) {
    console.error('Error obteniendo feed:', error)
    throw error
  }
}

// Obtener estadísticas del feed
export async function getFeedStats() {
  try {
    const response = await api.get('/feed/stats/')
    return response.data
  } catch (error) {
    console.error('Error obteniendo estadísticas del feed:', error)
    throw error
  }
}

// Crear un evento del feed
export async function createFeedEvent(eventData) {
  try {
    const response = await api.post('/feed/events/', eventData)
    return response.data
  } catch (error) {
    console.error('Error creando evento del feed:', error)
    throw error
  }
}

// Obtener eventos por tipo
export async function getEventsByType(eventType, days = 30) {
  try {
    const response = await api.get(`/feed/?event_type=${eventType}&days=${days}`)
    return response.data
  } catch (error) {
    console.error('Error obteniendo eventos por tipo:', error)
    throw error
  }
}

// Obtener eventos de un usuario específico
export async function getUserEvents(userId, days = 30) {
  try {
    const response = await api.get(`/feed/?user_id=${userId}&days=${days}`)
    return response.data
  } catch (error) {
    console.error('Error obteniendo eventos del usuario:', error)
    throw error
  }
}

// Obtener eventos de un viaje específico
export async function getTripEvents(tripId, days = 30) {
  try {
    const response = await api.get(`/feed/?trip_id=${tripId}&days=${days}`)
    return response.data
  } catch (error) {
    console.error('Error obteniendo eventos del viaje:', error)
    throw error
  }
}

// Funciones helper para crear eventos específicos
export async function createTripCreatedEvent(tripData) {
  return createFeedEvent({
    event_type: 'trip_created',
    title: `${tripData.creator_name} creó un nuevo viaje`,
    description: `Viaje a ${tripData.destination} desde ${tripData.origin}`,
    metadata: {
      trip_id: tripData.id,
      destination: tripData.destination,
      origin: tripData.origin,
      start_date: tripData.start_date
    }
  })
}

export async function createTripJoinedEvent(tripData, userName) {
  return createFeedEvent({
    event_type: 'trip_joined',
    title: `${userName} se unió a un viaje`,
    description: `Se unió al viaje a ${tripData.destination}`,
    metadata: {
      trip_id: tripData.id,
      destination: tripData.destination,
      trip_creator: tripData.creator_name
    }
  })
}

export async function createApplicationReceivedEvent(applicationData) {
  return createFeedEvent({
    event_type: 'application_received',
    title: `${applicationData.applicant_name} aplicó a tu viaje`,
    description: `Aplicó al viaje a ${applicationData.trip_destination}`,
    metadata: {
      application_id: applicationData.id,
      trip_id: applicationData.trip_id,
      message: applicationData.message
    }
  })
}

export async function createFriendshipRequestEvent(senderName, receiverName) {
  return createFeedEvent({
    event_type: 'friendship_request',
    title: `${senderName} te envió una solicitud de amistad`,
    description: `Quiere conectarse contigo`,
    metadata: {
      sender_name: senderName,
      receiver_name: receiverName
    }
  })
}

export async function createFriendshipAcceptedEvent(user1Name, user2Name) {
  return createFeedEvent({
    event_type: 'friendship_accepted',
    title: `${user1Name} y ${user2Name} ahora son amigos`,
    description: `Se conectaron en JetGo`,
    metadata: {
      user1_name: user1Name,
      user2_name: user2Name
    }
  })
}
