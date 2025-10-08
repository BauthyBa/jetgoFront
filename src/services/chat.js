import { supabase } from './supabase'
import { api } from './api'

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function listRoomsForUser(userId) {
  const { data: memberships, error: mErr } = await supabase
    .from('chat_members')
    .select('room_id')
    .eq('user_id', userId)
  if (mErr) throw mErr
  const roomIds = (memberships || []).map((m) => m.room_id)
  if (roomIds.length === 0) return []
  const { data: rooms, error: rErr } = await supabase
    .from('chat_rooms')
    .select('id, name, created_at, trip_id, application_id, is_private, is_group, creator_id')
    .in('id', roomIds)
    .order('created_at', { ascending: false })
  if (rErr) throw rErr
  const result = rooms || []
  // Resolve display_name for private rooms: show the other participant's name
  try {
    const privateRooms = result.filter((r) => r && (r.is_private === true || r.application_id))
    for (const pr of privateRooms) {
      try {
        // Query direct_conversations to find the other user
        const { data: convs } = await supabase
          .from('direct_conversations')
          .select('user_a,user_b')
          .eq('room_id', pr.id)
          .limit(1)
        
        const conv = (convs || [])[0]
        if (conv) {
          // Pick the other user: if I'm user_a, pick user_b, and vice versa
          const otherId = String(conv.user_a) === String(userId) ? conv.user_b : conv.user_a
          
          if (otherId) {
            const { data: users } = await supabase
              .from('User')
              .select('userid,nombre,apellido')
              .eq('userid', otherId)
            const u = (users || [])[0]
            if (u) {
              const full = [u.nombre, u.apellido].filter(Boolean).join(' ').trim()
              if (full) pr.display_name = full
            }
          }
        }
      } catch {}
    }
  } catch {}
  return result
}

export async function createRoom(name) {
  const { data: userData } = await supabase.auth.getUser()
  const authUser = userData?.user
  if (!authUser?.id) throw new Error('Debes iniciar sesión con Supabase para crear salas')
  const creatorId = authUser.id
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert([{ name, creator_id: creatorId }])
    .select()
    .single()
  if (error) throw error
  const room = data
  const { error: memErr } = await supabase
    .from('chat_members')
    .insert([{ room_id: room.id, user_id: creatorId, role: 'owner' }])
  if (memErr) throw memErr
  return room
}

export async function fetchMessages(roomId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, room_id, user_id, content, created_at, is_file, file_url, file_name, file_type, file_size')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function sendMessage(roomId, content) {
  const { data: userData } = await supabase.auth.getUser()
  const authUser = userData?.user
  if (!authUser?.id) throw new Error('Debes iniciar sesión con Supabase para enviar mensajes')
  const userId = authUser.id
  const trimmed = (content || '').trim()
  if (!trimmed) return null
  // Ensure room exists and user is member
  const { data: r, error: rErr } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('id', roomId)
    .single()
  if (rErr || !r) throw new Error('La sala no existe')
  const { data: m, error: mErr } = await supabase
    .from('chat_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle()
  if (mErr || !m) throw new Error('No sos miembro de esta sala')
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ room_id: roomId, user_id: userId, content: trimmed }])
    .select()
    .single()
  if (error) throw error
  return data
}

export function subscribeToRoomMessages(roomId, onInsert) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        if (onInsert) onInsert(payload.new)
      }
    )
    .subscribe()
  return () => {
    try { supabase.removeChannel(channel) } catch {}
  }
}

export async function inviteByEmail(roomId, email, inviterId) {
  const { data } = await api.post('/chat/invite/', { room_id: roomId, email, inviter_id: inviterId })
  return data
}

// Nuevas funciones para manejo de archivos
export async function uploadChatFile(file, roomId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('room_id', roomId)
  
  const { data } = await api.post('/chat/upload-file/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  })
  return data
}

export async function sendMessageWithFile(roomId, content, fileData) {
  const { data } = await api.post('/chat/send-message/', {
    room_id: roomId,
    content: content,
    file_data: fileData
  })
  return data
}

export async function getChatRooms() {
  const { data } = await api.get('/chat/rooms/')
  return data
}

export async function getChatMessages(roomId) {
  const { data } = await api.get(`/chat/rooms/${roomId}/messages/`)
  return data
}

export async function deleteChatFile(messageId) {
  const { data } = await api.delete(`/chat/messages/${messageId}/delete-file/`)
  return data
}

export async function getRoomFileStats(roomId) {
  const { data } = await api.get(`/chat/rooms/${roomId}/file-stats/`)
  return data
}


