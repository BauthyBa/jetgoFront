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
  return data
}
