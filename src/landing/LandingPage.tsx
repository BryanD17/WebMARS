import { useEffect } from 'react'
import './tokens.css'
import { Nav } from './Nav.tsx'
import { Hero } from './Hero.tsx'
import { ProofBar } from './ProofBar.tsx'
import { Features } from './Features.tsx'
import { Showcase } from './Showcase.tsx'
import { Personas } from './Personas.tsx'
import { OriginStory } from './OriginStory.tsx'
import { FinalCTA } from './FinalCTA.tsx'
import { Footer } from './Footer.tsx'

// Phase 4 SA-2: top-level landing page. Each section lives in its
// own file; this component just assembles them in order.

export default function LandingPage() {
  // Phase 4 SA-12: scroll-triggered reveal. Every element with the
  // .landing-reveal class fades + slides up 24px as it enters the
  // viewport. Each is unobserved after firing so animations only
  // play once. Honors prefers-reduced-motion via the CSS rule that
  // overrides the .landing-reveal opacity / transform.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-revealed')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    )
    document.querySelectorAll('.landing .landing-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing">
      {/* Skip link — visible only on focus. SA-12 a11y polish. */}
      <a href="#landing-main" className="skip-link">Skip to main content</a>
      <Nav />
      <main id="landing-main" tabIndex={-1}>
        <Hero />
        <ProofBar />
        <Features />
        <Showcase />
        <Personas />
        <OriginStory />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
