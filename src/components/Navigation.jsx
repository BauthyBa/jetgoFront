import { Button } from '@/components/ui/button'

import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '@/services/supabase'
import ColorBar from '@/components/ColorBar'
import ProfileMenu from '@/components/ProfileMenu'
import { Plus, Search } from 'lucide-react'

export default function Navigation() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const location = useLocation()
  
  // Hide navigation links on specific pages
  const hideNavLinks = location.pathname === '/viajes' || location.pathname.startsWith('/crear-viaje') || location.pathname === '/amigos'
  
  useEffect(() => {
    let mounted = true
    getSession().then((s) => { 
      if (mounted) {
        setLoggedIn(!!s?.user)
        setUser(s?.user || null)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) {
        setLoggedIn(!!session?.user)
        setUser(session?.user || null)
      }
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])
  return (
    <>
      <nav className="fixed top-0 w-full z-50 glass-nav" style={{ position: 'fixed' }}>
        <ColorBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 relative">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/jetgo.png?v=2" alt="JetGo" width="44" height="44" />
            <Link to="/" className="text-3xl font-extrabold text-white hover:text-emerald-400 transition-colors">JetGo</Link>
          </div>
          {!hideNavLinks && (
            <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
              <a href="#como-funciona" className="text-slate-200 hover:text-emerald-400 transition-colors font-medium">Cómo funciona</a>
              <a href="#beneficios" className="text-slate-200 hover:text-emerald-400 transition-colors font-medium">Beneficios</a>
              <a href="#testimonios" className="text-slate-200 hover:text-emerald-400 transition-colors font-medium">Testimonios</a>
            </div>
          )}
          <div className="flex items-center space-x-3 flex-shrink-0 ml-auto">
            {/* Buscar viajes button */}
            <Link to="/viajes">
              <Button variant="secondary" className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-4 py-2 flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Buscar viajes</span>
                <span className="sm:hidden">🔍</span>
              </Button>
            </Link>
            
            {/* Crear Viaje button */}
            <Link to="/crear-viaje">
              <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium px-4 py-2 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Crear Viaje</span>
                <span className="sm:hidden">+</span>
              </Button>
            </Link>
            
            
            {/* Profile Menu */}
            <ProfileMenu isLoggedIn={loggedIn} user={user} />
          </div>
        </div>
      </div>
    </nav>
    {/* Spacer para compensar la navbar fija */}
    <div className="h-16"></div>
    </>
  )
}


