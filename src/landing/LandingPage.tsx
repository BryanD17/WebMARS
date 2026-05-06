import './tokens.css'
import { Nav } from './Nav.tsx'
import { Hero } from './Hero.tsx'

// Phase 4 SA-2: top-level landing page. Each section lives in its
// own file; this component just assembles them in order. Sections
// are filled in incrementally per SA-3..SA-10.

export default function LandingPage() {
  return (
    <div className="landing">
      <Nav />
      <main>
        <Hero />
        {/* SA-4 ProofBar, SA-5 Features, SA-6 Showcase, SA-7
           Personas, SA-8 OriginStory, SA-9 FinalCTA arrive here. */}
      </main>
      {/* SA-10 Footer. */}
    </div>
  )
}
