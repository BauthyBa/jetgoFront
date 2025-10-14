import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '../services/supabase'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import ThemeToggle from '@/components/ThemeToggle'

export default function Layout() {
  const [loggedIn, setLoggedIn] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let mounted = true
    getSession().then((s) => { if (mounted) setLoggedIn(!!s?.user) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setLoggedIn(!!session?.user)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])
  const isRoot = location.pathname === '/'
  const hideHeaderOn = ['/verify-dni', '/dashboard', '/chats', '/login', '/signup', '/u/', '/trip', '/viajes', '/crear-viaje']
  const hideHeader = hideHeaderOn.some((p) => location.pathname.startsWith(p))
  return (
    <div>
      {!isRoot && !hideHeader && (
        <header className="header">
          <div className="header-inner">
            <nav className="nav">
              <Link to="/#como-funciona">Cómo funciona</Link>
              <Link to="/#beneficios">Beneficios</Link>
              <Link to="/#testimonios">Testimonios</Link>
              {!loggedIn && null}
            </nav>
            <Link to="/" className="brand" aria-label="JetGo">
              <img src="/jetgo.png?v=2" alt="" style={{ height: '1.1em', width: 'auto', verticalAlign: 'middle', marginRight: 8 }} />
              JetGo
            </Link>
            <div style={{ marginLeft: 'auto' }}>
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}
      {(isRoot || location.pathname === '/viajes' || location.pathname.startsWith('/crear-viaje')) && <Navigation />}
      {/* Compact back bar for views without main header and not dashboard */}
      {!isRoot && hideHeader && !location.pathname.startsWith('/dashboard') && (
        <div className="sticky top-0 z-30" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BackButton fallback="/" />
          </div>
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(148,163,184,0.25), rgba(148,163,184,0.06))' }} />
        </div>
      )}
      <main className={isRoot || hideHeader ? "" : "container"}>
        <Outlet />
      </main>
    </div>
  )
}
