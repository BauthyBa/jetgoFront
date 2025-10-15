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
import PublicProfile from './pages/PublicProfile.jsx'
import TripDetails from './pages/TripDetails.jsx'
import TripReviews from './pages/TripReviews.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ViajesPage from './pages/ViajesPage.jsx'
import CreateTripLanding from './pages/CreateTripLanding.jsx'
import CreateTripForm from './pages/CreateTripForm.jsx'
import { initializeApiBaseUrl } from './services/api.js'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <App /> },
      { path: 'register', element: <Register /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'verify-dni', element: <VerifyDni /> },
      { path: 'dashboard', element: <ModernChatPage /> },
      { path: 'chats', element: <ChatsPage /> },
      { path: 'modern-chat', element: <ModernChatPage /> },
      { path: 'viajes', element: <ViajesPage /> },
      { path: 'crear-viaje', element: <CreateTripLanding /> },
      { path: 'crear-viaje/formulario', element: <CreateTripForm /> },
      { path: 'u/:userId', element: <PublicProfile /> },
      { path: 'trip/:tripId', element: <TripDetails /> },
      { path: 'trip/:tripId/reviews', element: <TripReviews /> },
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
