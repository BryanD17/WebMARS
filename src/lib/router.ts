import { useEffect, useState } from 'react'

// Phase 4 SA-1: minimal client-side router. The app has exactly two
// routes (/ for the landing page, /app for the IDE) and adding
// react-router-dom for that scope would be overkill. This 30-line
// shim wraps window.history + popstate into a useRoute() hook.
//
// navigate('/app') pushes a new history entry and dispatches a
// synthetic popstate so any subscribed useRoute() instances rerender.
// The browser's back/forward buttons fire popstate natively.

export type Route = 'landing' | 'app'

export function getCurrentRoute(): Route {
  if (typeof window === 'undefined') return 'landing'
  return window.location.pathname.startsWith('/app') ? 'app' : 'landing'
}

export function navigate(to: '/' | '/app'): void {
  if (typeof window === 'undefined') return
  if (window.location.pathname === to) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(getCurrentRoute())
  useEffect(() => {
    function onPop(): void { setRoute(getCurrentRoute()) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return route
}
