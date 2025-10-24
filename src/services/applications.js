import { api } from './api'

export async function applyToTrip(tripId, message = '', userId) {
  const payload = { trip_id: tripId, message }
  if (userId) payload.user_id = userId
  const { data } = await api.post('/applications/', payload)
  return data
}

export async function respondToApplication(applicationId, action) {
  const { data } = await api.post('/applications/respond/', { application_id: applicationId, action })
  return data
}

export async function getUserApplications(userId) {
  const { data } = await api.get(`/applications/my/?user_id=${userId}`)
  try {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.applications)) return data.applications
    return []
  } catch {
    return []
  }
}

export async function getApplicationsByTrip(tripId) {
  const { data } = await api.get(`/applications/trip/${tripId}/`)
  try {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.applications)) return data.applications
    return []
  } catch {
    return []
  }
}

export async function updateApplicationStatus(applicationId, status) {
  const { data } = await api.post('/applications/respond/', { 
    application_id: applicationId, 
    action: status 
  })
  return data
}
