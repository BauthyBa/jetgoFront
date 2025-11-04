/**
 * Servicio simplificado para manejar avatares
 * Usa SOLO el backend Django que tiene permisos de admin
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

/**
 * Guardar avatar de un usuario
 */
export async function saveUserAvatar(userId, avatarUrl) {
  try {
    console.log('💾 Guardando avatar:', { userId, avatarUrl })
    
    // Primero obtener datos actuales del usuario
    console.log('📥 Obteniendo datos actuales del usuario...')
    const getUserResponse = await fetch(`${API_BASE}/profile/user/?user_id=${userId}`)
    
    let userData = {}
    if (getUserResponse.ok) {
      const result = await getUserResponse.json()
      userData = result?.user || {}
      console.log('📥 Datos actuales obtenidos:', userData)
    }
    
    // Preparar payload con datos actuales + nuevo avatar
    const payload = {
      user_id: userId,
      email: userData.mail || '',
      first_name: userData.nombre || '',
      last_name: userData.apellido || '',
      document_number: userData.dni || '',
      sex: userData.sexo || '',
      birth_date: userData.fecha_nacimiento || '',
      bio: userData.bio || '',
      interests: userData.interests || [],
      favorite_travel_styles: userData.favorite_travel_styles || [],
      avatar_url: avatarUrl  // El nuevo avatar
    }
    
    console.log('💾 Enviando al backend:', payload)
    
    const response = await fetch(`${API_BASE}/auth/upsert_profile/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    console.log('💾 Respuesta del servidor:', data)
    
    if (data.ok) {
      console.log('✅ Avatar guardado exitosamente')
      return { success: true, data }
    } else {
      console.error('❌ Error guardando avatar:', data)
      return { success: false, error: data.error || 'Error desconocido' }
    }
  } catch (error) {
    console.error('❌ Error en saveUserAvatar:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtener avatar de un usuario
 */
export async function getUserAvatar(userId) {
  try {
    const response = await fetch(`${API_BASE}/profile/user/?user_id=${userId}`)
    
    if (response.ok) {
      const data = await response.json()
      const avatarUrl = data?.user?.avatar_url
      
      if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== null) {
        return avatarUrl
      }
    }
  } catch (error) {
    console.error('Error obteniendo avatar:', error)
  }
  
  return null
}

/**
 * Cache simple de avatares
 */
const avatarCache = new Map()

export function getCachedAvatar(userId) {
  return avatarCache.get(userId) || null
}

export function setCachedAvatar(userId, avatarUrl) {
  avatarCache.set(userId, avatarUrl)
}

export function clearAvatarCache(userId = null) {
  if (userId) {
    avatarCache.delete(userId)
  } else {
    avatarCache.clear()
  }
}
