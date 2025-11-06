/**
 * Helper para cargar el avatar de un usuario desde el backend
 * El backend usa el admin de Supabase, así que no tiene problemas de RLS
 */

import { getApiBaseUrl } from '@/services/api'

// Cache de avatares para evitar peticiones repetidas
const avatarCache = new Map()

export async function loadUserAvatar(userId) {
  if (!userId) {
    return null
  }

  // Verificar cache
  if (avatarCache.has(userId)) {
    return avatarCache.get(userId)
  }

  const apiBaseUrl = typeof getApiBaseUrl === 'function' ? getApiBaseUrl() : null

  if (!apiBaseUrl) {
    console.warn('⚠️ No se pudo resolver la base URL de la API; se omite la carga de avatar.')
    avatarCache.set(userId, null)
    return null
  }

  try {
    const backendUrl = `${apiBaseUrl}/profile/user/?user_id=${userId}`
    
    const response = await fetch(backendUrl)
    
    if (response.ok) {
      const data = await response.json()
      const avatarUrl = data?.user?.avatar_url
      
      if (avatarUrl && avatarUrl !== null && avatarUrl !== 'null') {
        avatarCache.set(userId, avatarUrl)
        return avatarUrl
      }
    }
  } catch (error) {
    console.warn('⚠️ Error cargando avatar desde backend:', error)
  }
  
  avatarCache.set(userId, null)
  return null
}

/**
 * Cargar avatares de múltiples usuarios a la vez
 */
export async function loadMultipleAvatars(userIds) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean)
  const promises = uniqueIds.map(id => loadUserAvatar(id))
  const results = await Promise.all(promises)
  
  const avatarMap = {}
  uniqueIds.forEach((id, index) => {
    avatarMap[id] = results[index]
  })
  
  return avatarMap
}

/**
 * Limpiar cache de avatares (útil después de actualizar un avatar)
 */
export function clearAvatarCache(userId = null) {
  if (userId) {
    avatarCache.delete(userId)
  } else {
    avatarCache.clear()
  }
}

/**
 * Hook para usar en componentes React
 */
export function useUserAvatar(userId, fallbackUrl = null) {
  const [avatarUrl, setAvatarUrl] = React.useState(fallbackUrl)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    loadUserAvatar(userId).then(url => {
      setAvatarUrl(url || fallbackUrl)
      setLoading(false)
    })
  }, [userId, fallbackUrl])

  return { avatarUrl, loading }
}
