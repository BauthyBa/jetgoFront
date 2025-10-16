import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '../services/supabase'
import Navigation from '@/components/Navigation'
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
  const hideHeaderOn = ['/verify-dni', '/dashboard', '/chats', '/modern-chat', '/login', '/signup', '/u/', '/trip', '/viajes', '/crear-viaje', '/profile', '/amigos']
  const hideHeader = hideHeaderOn.some((p) => location.pathname.startsWith(p))
  const showNavigation =
    isRoot ||
    location.pathname === '/viajes' ||
    location.pathname === '/amigos' ||
    location.pathname.startsWith('/crear-viaje')
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
      {showNavigation && <Navigation />}
      <main className={isRoot || hideHeader ? "" : "container"} style={{ paddingTop: !isRoot && !hideHeader ? '4rem' : '0' }}>
        <Outlet />
      </main>
    </div>
  )
}
