export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL || 'https://pamidjksvzshakzkrtdy.supabase.co', SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbWlkamtzdnpzaGFremtydGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODgzODMsImV4cCI6MjA2OTM2NDM4M30.sjYTaPhMNymAiJI63Ia9Z7i9ur6izKqRawpkNBSEJdw')
const SESSION_REFRESH_MARGIN = 0
const REFRESH_BACKOFF_MS = 30_000
let cachedSession = null
let pendingSessionPromise = null
let lastRefreshErrorAt = -REFRESH_BACKOFF_MS

function sessionNeedsRefresh(session, forceRefresh = false) {
  if (!session) return true
  if (forceRefresh) return true
  const expiresAt = session?.expires_at
  if (!expiresAt) return false
  const now = Math.floor(Date.now() / 1000)
  return expiresAt - SESSION_REFRESH_MARGIN <= now
}

async function fetchSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    cachedSession = data?.session ?? cachedSession
    return cachedSession
  } catch (error) {
    lastRefreshErrorAt = Date.now()
    const status = error?.status ?? error?.statusCode
    if ((status === 429 || /Too Many Requests/i.test(error?.message || '')) && cachedSession) {
      console.warn('Supabase session refresh throttled (429). Using cached session.')
      return cachedSession
    }
    throw error
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  cachedSession = session ?? null
})

export async function signInWithGoogle(redirectPath = '/') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + redirectPath }
  })
  if (error) throw error
  return data
}

export async function getSession(options = {}) {
  const forceRefresh = options?.forceRefresh === true
  try {
    if (!cachedSession && Date.now() - lastRefreshErrorAt < REFRESH_BACKOFF_MS) {
      return null
    }
    if (cachedSession && Date.now() - lastRefreshErrorAt < REFRESH_BACKOFF_MS) {
      return cachedSession
    }
    if (!sessionNeedsRefresh(cachedSession, forceRefresh)) {
      return cachedSession
    }
    if (!pendingSessionPromise) {
      pendingSessionPromise = fetchSession()
        .catch((error) => {
          console.error('Supabase getSession failed:', error)
          return cachedSession
        })
        .finally(() => {
          pendingSessionPromise = null
        })
    }
    return pendingSessionPromise
  } catch (error) {
    console.error('Supabase getSession failed:', error)
    return cachedSession
  }
}

export async function updateUserMetadata(metadata) {
  const { data, error } = await supabase.auth.updateUser({ data: metadata })
  if (error) throw error
  return data
}
