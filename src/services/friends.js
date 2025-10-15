import { api } from './api'

// Enviar solicitud de amistad
export async function sendFriendRequest(senderId, receiverId) {
  try {
    const response = await api.post('/friends/send-request/', {
      sender_id: senderId,
      receiver_id: receiverId
    })
    return response.data
  } catch (error) {
    console.error('Error enviando solicitud de amistad:', error)
    throw error
  }
}

// Responder a una solicitud de amistad
export async function respondFriendRequest(requestId, action, userId) {
  try {
    const response = await api.post('/friends/respond-request/', {
      request_id: requestId,
      action: action, // 'accept' o 'reject'
      user_id: userId
    })
    return response.data
  } catch (error) {
    console.error('Error respondiendo solicitud de amistad:', error)
    throw error
  }
}

// Obtener solicitudes de amistad
export async function getFriendRequests(userId, type = 'received') {
  try {
    console.log('🔍 friends.js - Obteniendo solicitudes para:', userId, 'tipo:', type)
    const response = await api.get(`/friends/requests/?user_id=${userId}&type=${type}`)
    console.log('🔍 friends.js - Respuesta completa:', response)
    return response.data
  } catch (error) {
    console.error('🔍 friends.js - Error obteniendo solicitudes de amistad:', error)
    throw error
  }
}

// Obtener lista de amigos
export async function getFriends(userId) {
  try {
    const response = await api.get(`/friends/list/?user_id=${userId}`)
    return response.data
  } catch (error) {
    console.error('Error obteniendo amigos:', error)
    throw error
  }
}

// Verificar estado de amistad entre dos usuarios
export async function checkFriendshipStatus(user1Id, user2Id) {
  try {
    const response = await api.get(`/friends/check-status/?user1_id=${user1Id}&user2_id=${user2Id}`)
    return response.data
  } catch (error) {
    console.error('Error verificando estado de amistad:', error)
    throw error
  }
}

// Invitar un amigo a un viaje
export async function inviteFriendToTrip(tripId, friendId, organizerId) {
  try {
    const response = await api.post('/friends/invite-to-trip/', {
      trip_id: tripId,
      friend_id: friendId,
      organizer_id: organizerId
    })
    return response.data
  } catch (error) {
    console.error('Error invitando amigo a viaje:', error)
    throw error
  }
}
