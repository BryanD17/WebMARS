import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = '(max-width: 767px)'

// Subscribes to a CSS media query for the mobile breakpoint. Returns
// false during SSR / pre-paint so the desktop layout renders first
// and only flips to mobile once the matchMedia API confirms a small
// viewport — avoids a flash of mobile chrome on hydration.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(MOBILE_BREAKPOINT).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(MOBILE_BREAKPOINT)
    function handler(event: MediaQueryListEvent): void {
      setIsMobile(event.matches)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
