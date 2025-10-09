export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL || 'https://pamidjksvzshakzkrtdy.supabase.co', SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbWlkamtzdnpzaGFremtydGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODgzODMsImV4cCI6MjA2OTM2NDM4M30.sjYTaPhMNymAiJI63Ia9Z7i9ur6izKqRawpkNBSEJdw')

export async function signInWithGoogle(redirectPath = '/') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + redirectPath }
  })
  if (error) throw error
  return data
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function updateUserMetadata(metadata) {
  const { data, error } = await supabase.auth.updateUser({ data: metadata })
  if (error) throw error
  return data
}
