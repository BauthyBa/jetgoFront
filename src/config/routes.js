/**
 * Constantes de rutas de la aplicación
 * Centraliza todas las rutas para evitar inconsistencias
 */

export const ROUTES = {
  // Rutas principales
  HOME: '/',
  VIAJES: '/viajes',
  MIS_VIAJES: '/mis-viajes',
  CHATS: '/chats',
  MODERN_CHAT: '/modern-chat',
  AMIGOS: '/amigos',
  SOCIAL: '/social',
  CLIMA: '/clima',
  PROFILE: '/profile',
  
  // Rutas de autenticación
  LOGIN: '/login',
  REGISTER: '/register',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_DNI: '/verify-dni',
  
  // Rutas de viajes
  CREAR_VIAJE: '/crear-viaje',
  CREAR_VIAJE_FORM: '/crear-viaje/formulario',
  EDITAR_VIAJE: (tripId) => `/editar-viaje/${tripId}`,
  TRIP_DETAILS: (tripId) => `/trip/${tripId}`,
  TRIP_REVIEWS: (tripId) => `/trip/${tripId}/reviews`,
  TRIP_CHAT: (tripId) => `/modern-chat?trip=${encodeURIComponent(tripId)}`,
  
  // Rutas de perfil
  PROFILE_SETTINGS: '/profile/settings',
  PROFILE_REVIEWS: '/profile/reviews',
  PUBLIC_PROFILE_BY_USERNAME: (username) => `/u/${username}`,
  PUBLIC_PROFILE_BY_ID: (userId) => `/profile/${userId}`,
  
  // Rutas del dashboard
  DASHBOARD: '/dashboard',
}

export default ROUTES

