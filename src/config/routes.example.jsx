/**
 * EJEMPLOS DE USO DE CONSTANTES DE RUTAS
 * 
 * Este archivo contiene ejemplos de cómo usar correctamente
 * las constantes de rutas en diferentes contextos.
 */

import { useNavigate, Link } from 'react-router-dom'
import ROUTES from './routes'

// ============================================
// EJEMPLO 1: Navegación programática con useNavigate
// ============================================
function ExampleNavigate() {
  const navigate = useNavigate()

  const handleGoToTrips = () => {
    // ✅ CORRECTO
    navigate(ROUTES.VIAJES)
    
    // ❌ INCORRECTO
    // navigate('/viajes')
  }

  const handleGoToTripDetails = (tripId) => {
    // ✅ CORRECTO - Rutas dinámicas
    navigate(ROUTES.TRIP_DETAILS(tripId))
    
    // ❌ INCORRECTO
    // navigate(`/trip/${tripId}`)
  }

  const handleGoToChat = (tripId) => {
    // ✅ CORRECTO - Rutas con query params
    navigate(ROUTES.TRIP_CHAT(tripId))
    
    // ❌ INCORRECTO
    // navigate(`/modern-chat?trip=${tripId}`)
  }

  return (
    <div>
      <button onClick={handleGoToTrips}>Ir a Viajes</button>
      <button onClick={() => handleGoToTripDetails(123)}>Ver viaje #123</button>
      <button onClick={() => handleGoToChat(123)}>Chat del viaje #123</button>
    </div>
  )
}

// ============================================
// EJEMPLO 2: Links de React Router
// ============================================
function ExampleLinks() {
  const tripId = 456

  return (
    <div>
      {/* ✅ CORRECTO - Rutas estáticas */}
      <Link to={ROUTES.VIAJES}>Mis Viajes</Link>
      <Link to={ROUTES.CHATS}>Chats</Link>
      <Link to={ROUTES.PROFILE}>Mi Perfil</Link>
      
      {/* ✅ CORRECTO - Rutas dinámicas */}
      <Link to={ROUTES.TRIP_DETAILS(tripId)}>Ver Detalles</Link>
      <Link to={ROUTES.TRIP_REVIEWS(tripId)}>Ver Reseñas</Link>
      
      {/* ❌ INCORRECTO */}
      {/* <Link to="/viajes">Mis Viajes</Link> */}
      {/* <Link to={`/trip/${tripId}`}>Ver Detalles</Link> */}
    </div>
  )
}

// ============================================
// EJEMPLO 3: Comparación de rutas
// ============================================
function ExampleComparison() {
  const location = useLocation()

  // ✅ CORRECTO
  const isOnTripsPage = location.pathname === ROUTES.VIAJES
  const isOnChatPage = location.pathname === ROUTES.CHATS
  
  // ✅ CORRECTO - Verificar rutas dinámicas
  const isOnTripDetail = location.pathname.startsWith('/trip/')
  
  // ❌ INCORRECTO
  // const isOnTripsPage = location.pathname === '/viajes'

  return (
    <div>
      {isOnTripsPage && <p>Estás en la página de viajes</p>}
      {isOnChatPage && <p>Estás en la página de chats</p>}
      {isOnTripDetail && <p>Estás viendo un viaje</p>}
    </div>
  )
}

// ============================================
// EJEMPLO 4: Navegación condicional
// ============================================
function ExampleConditionalNavigation({ user, trip }) {
  const navigate = useNavigate()

  const handleAction = () => {
    if (!user) {
      // Usuario no logueado → Login
      navigate(ROUTES.LOGIN)
    } else if (user.id === trip.creatorId) {
      // Usuario es el organizador → Chat
      navigate(ROUTES.TRIP_CHAT(trip.id))
    } else if (trip.isMember) {
      // Usuario es participante → Chat
      navigate(ROUTES.TRIP_CHAT(trip.id))
    } else if (trip.hasApplied) {
      // Usuario ya aplicó → Ver aplicaciones
      navigate(ROUTES.VIAJES)
    } else {
      // Usuario no ha aplicado → Página de viajes para aplicar
      navigate(ROUTES.VIAJES)
    }
  }

  return <button onClick={handleAction}>Acción Contextual</button>
}

// ============================================
// EJEMPLO 5: Redirección después de acción
// ============================================
function ExampleRedirectAfterAction() {
  const navigate = useNavigate()

  const handleCreateTrip = async (tripData) => {
    try {
      const newTrip = await createTrip(tripData)
      
      // ✅ CORRECTO - Redirigir al detalle del viaje creado
      navigate(ROUTES.TRIP_DETAILS(newTrip.id))
      
      // ❌ INCORRECTO
      // navigate(`/trip/${newTrip.id}`)
    } catch (error) {
      console.error('Error creando viaje:', error)
    }
  }

  const handleLogout = async () => {
    await logout()
    
    // ✅ CORRECTO - Redirigir al home
    navigate(ROUTES.HOME)
    
    // ❌ INCORRECTO
    // navigate('/')
  }

  return (
    <div>
      <button onClick={handleCreateTrip}>Crear Viaje</button>
      <button onClick={handleLogout}>Cerrar Sesión</button>
    </div>
  )
}

// ============================================
// EJEMPLO 6: Breadcrumbs
// ============================================
function ExampleBreadcrumbs({ tripId, tripName }) {
  return (
    <nav aria-label="breadcrumb">
      <ol>
        <li>
          {/* ✅ CORRECTO */}
          <Link to={ROUTES.HOME}>Inicio</Link>
        </li>
        <li>
          <Link to={ROUTES.VIAJES}>Viajes</Link>
        </li>
        <li aria-current="page">
          <Link to={ROUTES.TRIP_DETAILS(tripId)}>{tripName}</Link>
        </li>
      </ol>
    </nav>
  )
}

// ============================================
// EJEMPLO 7: Menu de navegación
// ============================================
function ExampleNavMenu() {
  const menuItems = [
    { label: 'Mis Viajes', path: ROUTES.VIAJES, icon: '🗺️' },
    { label: 'Chats', path: ROUTES.CHATS, icon: '💬' },
    { label: 'Amigos', path: ROUTES.AMIGOS, icon: '👥' },
    { label: 'Perfil', path: ROUTES.PROFILE, icon: '👤' },
  ]

  return (
    <nav>
      {menuItems.map((item) => (
        <Link key={item.path} to={item.path}>
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

// ============================================
// EJEMPLO 8: Perfiles públicos
// ============================================
function ExamplePublicProfile({ username, userId }) {
  const navigate = useNavigate()

  const goToUserProfile = () => {
    if (username) {
      // ✅ CORRECTO - Usar username si está disponible
      navigate(ROUTES.PUBLIC_PROFILE_BY_USERNAME(username))
    } else {
      // ✅ CORRECTO - Fallback a userId
      navigate(ROUTES.PUBLIC_PROFILE_BY_ID(userId))
    }
  }

  return <button onClick={goToUserProfile}>Ver Perfil</button>
}

// ============================================
// RESUMEN DE BUENAS PRÁCTICAS
// ============================================

/**
 * ✅ HACER:
 * 
 * 1. Importar ROUTES en cada componente que use rutas
 * 2. Usar las constantes para toda navegación
 * 3. Usar funciones para rutas dinámicas: ROUTES.TRIP_DETAILS(id)
 * 4. Comparar rutas usando las constantes
 * 5. Actualizar routes.js si se agregan nuevas rutas
 * 
 * ❌ NO HACER:
 * 
 * 1. Hardcodear rutas como strings: '/viajes'
 * 2. Usar template literals: \`/trip/\${id}\`
 * 3. Duplicar definiciones de rutas
 * 4. Olvidar actualizar routes.js con nuevas rutas
 * 5. Mezclar rutas hardcodeadas con constantes
 */

export {
  ExampleNavigate,
  ExampleLinks,
  ExampleComparison,
  ExampleConditionalNavigation,
  ExampleRedirectAfterAction,
  ExampleBreadcrumbs,
  ExampleNavMenu,
  ExamplePublicProfile,
}

