import { useEffect, useState } from 'react'
import { navigate } from '@/lib/router.ts'
import { REPO_URL } from '@/lib/constants.ts'

// Phase 4 SA-3 nav bar. 72px tall, sticky. Translucent + 1px bottom
// border once the user has scrolled past 80px so the brand area
// doesn't collide with hero text. Mobile collapses the center
// anchors and shows a hamburger instead.

const NAV_LINKS = [
  { label: 'Features',    href: '#features' },
  { label: 'How it works',href: '#showcase' },
  { label: "Who it's for", href: '#personas' },
  { label: 'The team',    href: '#team' },
] as const

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function onScroll(): void {
      setScrolled(window.scrollY > 80)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header
      className="sticky top-0 z-30 transition-colors"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--l-border)' : '1px solid transparent',
        backdropFilter: scrolled ? 'saturate(140%) blur(8px)' : undefined,
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <button
          type="button"
          onClick={scrollToTop}
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-accent)]"
          aria-label="WebMARS — back to top"
        >
          <span aria-hidden="true" style={{ width: 12, height: 12, background: 'var(--l-accent)', borderRadius: 2 }} />
          <span className="text-xl font-bold" style={{ color: 'var(--l-ink-1)' }}>WebMARS</span>
        </button>

        {/* Center anchors — desktop only */}
        <nav aria-label="Sections" className="hidden md:flex items-center gap-8 text-[15px] font-medium" style={{ color: 'var(--l-ink-2)' }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:[color:var(--l-ink-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-accent)] rounded"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[15px] font-medium transition-colors hover:[color:var(--l-ink-1)]"
            style={{ color: 'var(--l-ink-2)' }}
          >
            GitHub
          </a>
          <button
            type="button"
            onClick={() => navigate('/app')}
            className="rounded-[10px] px-5 text-[15px] font-semibold text-white transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--l-accent)]"
            style={{ background: 'var(--l-accent)', height: 40 }}
          >
            Try the editor
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden flex size-10 items-center justify-center rounded-md text-[var(--l-ink-1)] hover:bg-[var(--l-bg-alt)]"
        >
          <span aria-hidden="true" className="text-2xl">{mobileOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden absolute left-0 top-[72px] w-full border-t"
          style={{ background: 'var(--l-bg)', borderColor: 'var(--l-border)' }}
        >
          <ul className="flex flex-col px-6 py-4 text-base">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3"
                  style={{ color: 'var(--l-ink-1)' }}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="block py-3"
                style={{ color: 'var(--l-ink-1)' }}
              >
                GitHub
              </a>
            </li>
            <li className="pt-2">
              <button
                type="button"
                onClick={() => { setMobileOpen(false); navigate('/app') }}
                className="w-full rounded-[10px] px-5 py-3 text-base font-semibold text-white"
                style={{ background: 'var(--l-accent)' }}
              >
                Try the editor
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
