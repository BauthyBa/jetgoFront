import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ChatsPage from './pages/ChatsPage.jsx'
import ModernChatPage from './pages/ModernChatPage.jsx'
import VerifyDni from './pages/VerifyDni.jsx'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PublicProfilePage from './pages/PublicProfilePage.jsx'
import TripDetails from './pages/TripDetails.jsx'
import TripReviews from './pages/TripReviews.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ViajesPage from './pages/ViajesPage.jsx'
import CreateTripLanding from './pages/CreateTripLanding.jsx'
import CreateTripForm from './pages/CreateTripForm.jsx'
import FriendsPage from './pages/FriendsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ReviewsPage from './pages/ReviewsPage.jsx'
import AccountSettingsPage from './pages/AccountSettingsPage.jsx'
import SocialPage from './pages/SocialPage.jsx'
import WeatherPage from './pages/WeatherPage.jsx'
import MisViajesPage from './pages/MisViajesPage.jsx'
import { initializeApiBaseUrl } from './services/api.js'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      // Rutas públicas (sin verificación requerida)
      { index: true, element: <App /> },
      { path: 'register', element: <Register /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'verify-dni', element: <VerifyDni /> },
      { path: 'profile', element: <ProfilePage /> },
      
      // Rutas protegidas (requieren verificación de DNI)
      { 
        path: 'dashboard', 
        element: <ProtectedRoute><ModernChatPage /></ProtectedRoute> 
      },
      { 
        path: 'chats', 
        element: <ProtectedRoute><ChatsPage /></ProtectedRoute> 
      },
      { 
        path: 'modern-chat', 
        element: <ProtectedRoute><ModernChatPage /></ProtectedRoute> 
      },
      { 
        path: 'viajes', 
        element: <ProtectedRoute><ViajesPage /></ProtectedRoute> 
      },
      { 
        path: 'mis-viajes', 
        element: <ProtectedRoute><MisViajesPage /></ProtectedRoute> 
      },
      { 
        path: 'amigos', 
        element: <ProtectedRoute><FriendsPage /></ProtectedRoute> 
      },
      { 
        path: 'social', 
        element: <ProtectedRoute><SocialPage /></ProtectedRoute> 
      },
      { 
        path: 'clima', 
        element: <ProtectedRoute><WeatherPage /></ProtectedRoute> 
      },
      { 
        path: 'crear-viaje', 
        element: <ProtectedRoute><CreateTripLanding /></ProtectedRoute> 
      },
      { 
        path: 'crear-viaje/formulario', 
        element: <ProtectedRoute><CreateTripForm /></ProtectedRoute> 
      },
      { 
        path: 'u/:username', 
        element: <ProtectedRoute><PublicProfilePage /></ProtectedRoute> 
      },
      { 
        path: 'trip/:tripId', 
        element: <ProtectedRoute><TripDetails /></ProtectedRoute> 
      },
      { 
        path: 'trip/:tripId/reviews', 
        element: <ProtectedRoute><TripReviews /></ProtectedRoute> 
      },
      { 
        path: 'profile/:userId', 
        element: <ProtectedRoute><PublicProfilePage /></ProtectedRoute> 
      },
      { 
        path: 'profile/reviews', 
        element: <ProtectedRoute><ReviewsPage /></ProtectedRoute> 
      },
      { 
        path: 'profile/settings', 
        element: <ProtectedRoute><AccountSettingsPage /></ProtectedRoute> 
      },
    ],
  },
  // Rutas de autenticación sin Layout (sin navbar)
  { path: 'forgot-password', element: <ForgotPassword /> },
  { path: 'reset-password', element: <ResetPassword /> },
])

async function bootstrap() {
  try {
    await initializeApiBaseUrl()
  } catch (_error) {
    // Default a la URL definida en build si la detección falla.
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

bootstrap()
