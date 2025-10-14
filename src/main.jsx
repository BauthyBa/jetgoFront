import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import VerifyDni from './pages/VerifyDni.jsx'
import Layout from './components/Layout.jsx'
import PublicProfile from './pages/PublicProfile.jsx'
import TripDetails from './pages/TripDetails.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import ViajesPage from './pages/ViajesPage.jsx'
import CreateTripLanding from './pages/CreateTripLanding.jsx'
import CreateTripForm from './pages/CreateTripForm.jsx'

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
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'viajes', element: <ViajesPage /> },
      { path: 'crear-viaje', element: <CreateTripLanding /> },
      { path: 'crear-viaje/formulario', element: <CreateTripForm /> },
      { path: 'u/:userId', element: <PublicProfile /> },
      { path: 'trip/:tripId', element: <TripDetails /> },
    ],
  },
  // Rutas de autenticación sin Layout (sin navbar)
  { path: 'forgot-password', element: <ForgotPassword /> },
  { path: 'reset-password', element: <ResetPassword /> },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
