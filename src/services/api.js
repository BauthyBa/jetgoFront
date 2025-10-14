import axios from 'axios'
import { supabase } from './supabase'

function normalizeBaseUrl(url) {
  if (!url) return null
  return url.replace(/\/+$/, '')
}

const REMOTE_API_BASE_URL = normalizeBaseUrl('https://jetgoback.onrender.com/api')
const ENV_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
const LOCAL_CANDIDATE = normalizeBaseUrl(import.meta.env.VITE_LOCAL_API_BASE_URL) || normalizeBaseUrl('http://localhost:8000/api')

const INITIAL_API_BASE_URL = ENV_BASE_URL || REMOTE_API_BASE_URL

export const api = axios.create({ baseURL: INITIAL_API_BASE_URL })
export const apiPublic = axios.create({ baseURL: INITIAL_API_BASE_URL })

let resolvedApiBaseUrl = INITIAL_API_BASE_URL

function applyBaseUrl(baseUrl) {
  if (!baseUrl || baseUrl === resolvedApiBaseUrl) return
  resolvedApiBaseUrl = baseUrl
  api.defaults.baseURL = baseUrl
  apiPublic.defaults.baseURL = baseUrl
  console.info(`[api] Base URL set to ${baseUrl}`)
}

function isBrowserEnvironment() {
  return typeof window !== 'undefined' && typeof window.fetch === 'function'
}

async function isBackendReachable(baseUrl) {
  if (!isBrowserEnvironment()) return false
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(`${baseUrl}/test/`, {
      method: 'GET',
      signal: controller.signal,
      credentials: 'omit',
    })
    return response.ok
  } catch (_error) {
    return false
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function initializeApiBaseUrl() {
  if (ENV_BASE_URL || !isBrowserEnvironment()) {
    return resolvedApiBaseUrl
  }

  const host = window.location.hostname
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(host)
  if (!isLocalHost || !LOCAL_CANDIDATE) {
    return resolvedApiBaseUrl
  }

  if (resolvedApiBaseUrl === LOCAL_CANDIDATE) {
    return resolvedApiBaseUrl
  }

  const reachable = await isBackendReachable(LOCAL_CANDIDATE)
  if (reachable) {
    applyBaseUrl(LOCAL_CANDIDATE)
  }

  return resolvedApiBaseUrl
}

export function getApiBaseUrl() {
  return resolvedApiBaseUrl
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    localStorage.setItem('access_token', token)
  } else {
    delete api.defaults.headers.common['Authorization']
    localStorage.removeItem('access_token')
  }
}

function isTokenExpired(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const { exp } = JSON.parse(jsonPayload)
    if (!exp) return true
    const nowSec = Math.floor(Date.now() / 1000)
    return exp <= nowSec
  } catch (e) {
    return true
  }
}

const saved = localStorage.getItem('access_token')
if (saved) {
  if (isTokenExpired(saved)) {
    setAuthToken(null)
  } else {
    setAuthToken(saved)
  }
}

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const code = error?.response?.data?.code
    if (error?.response?.status === 401 && (code === 'token_not_valid' || code === 'user_not_authenticated')) {
      setAuthToken(null)
    }
    return Promise.reject(error)
  }
)

export async function registerUser(payload) {
  const { data } = await apiPublic.post('/auth/register/', payload)
  try {
    if (payload?.email && payload?.password) {
      await supabase.auth.signUp({ email: payload.email, password: payload.password })
    }
  } catch (_e) {
    // No bloquear registro backend si Supabase falla; el usuario podrá loguearse luego
  }
  return data
}

export async function login(email, password) {
  const { data } = await apiPublic.post('/auth/login/', { email, password })
  setAuthToken(data.access)
  try {
    await supabase.auth.signInWithPassword({ email, password })
  } catch (_e) {
    // Si falla Supabase, el dashboard básico funciona, pero el chat (RLS) no.
  }
  return data
}

export async function upsertProfileToBackend(payload) {
  const { data } = await api.post('/auth/upsert_profile/', payload)
  return data
}

// Funciones para reseñas (usando Supabase)
export async function createReview(payload) {
  // Preferir endpoint Django (no requiere credenciales admin). Si no existe, usar Supabase.
  try {
    const { data } = await apiPublic.post('/reviews/create/', payload)
    return data
  } catch (ePrimary) {
    try {
      const { data } = await apiPublic.post('/supabase/reviews/create/', payload)
      return data
    } catch (eFallback) {
      const msg = eFallback?.response?.data?.error || ePrimary?.response?.data?.error || eFallback?.message || ePrimary?.message || 'No se pudo crear la reseña'
      return { ok: false, error: msg }
    }
  }
}

export async function getUserReviews(userId) {
  const { data } = await apiPublic.get(`/supabase/reviews/user/?user_id=${userId}`)
  return data
}

export async function getUserProfile(userId) {
  const { data } = await apiPublic.get(`/profile/user/?user_id=${userId}`)
  return data
}

// Funciones para notificaciones
export async function getUserNotifications(userId, limit = 20) {
  const { data } = await apiPublic.get(`/supabase/notifications/?user_id=${userId}&limit=${limit}`)
  return data
}

export async function markNotificationRead(notificationId, userId) {
  const { data } = await apiPublic.post('/supabase/notifications/read/', {
    notification_id: notificationId,
    user_id: userId
  })
  return data
}

export async function markAllNotificationsRead(userId) {
  const { data } = await apiPublic.post('/supabase/notifications/read-all/', {
    user_id: userId
  })
  return data
}

// Funciones para reportes de usuarios
export async function createUserReport(payload) {
  const { data } = await apiPublic.post('/reports/create/', payload)
  return data
}

export async function getUserReports(userId, type = 'received') {
  const { data } = await apiPublic.get(`/reports/user/?user_id=${userId}&type=${type}`)
  return data
}

export async function checkUserSuspension(userId) {
  const { data } = await apiPublic.get(`/reports/suspension/?user_id=${userId}`)
  return data
}

export async function getReportReasons() {
  const { data } = await apiPublic.get('/reports/reasons/')
  return data
}

// Función para subir imagen de evidencia a Supabase Storage
export async function uploadReportEvidence(file, userId) {
  try {
    const { supabase } = await import('./supabase')
    
    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    // Subir archivo al bucket report-evidence
    const { data, error } = await supabase.storage
      .from('report-evidence')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw error
    }

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('report-evidence')
      .getPublicUrl(fileName)

    return {
      ok: true,
      url: urlData.publicUrl,
      path: fileName
    }
  } catch (error) {
    return {
      ok: false,
      error: error.message
    }
  }
}

// Función para obtener avatar_url de un usuario
export async function getUserAvatar(userId) {
  try {
    const response = await api.get('/profile/avatar/', {
      params: { user_id: userId }
    })
    return response.data
  } catch (error) {
    console.error('Error getting user avatar:', error)
    return { ok: false, error: error.message }
  }
}

// Funciones para recuperación de contraseña
export { sendPasswordResetEmail, updatePassword } from './passwordReset'


