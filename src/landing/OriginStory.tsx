import { navigate } from '@/lib/router.ts'
import { REPO_URL } from '@/lib/constants.ts'

// Phase 4 SA-8: replaces the spec's fake testimonials with a
// truthful origin story and three real team cards. Dark section
// for visual contrast against the light surrounding sections.

const PRD_URL = `${REPO_URL}/blob/main/docs/PRD.md`

interface TeamMember {
  initials: string
  name: string
  role: string
  body: string
}

const TEAM: ReadonlyArray<TeamMember> = [
  {
    initials: 'BD',
    name: 'Bryan Djenabia',
    role: 'UI, integration, deployment',
    body:
      'Owned the editor shell, the integration seam between the simulator and the UI, the design system, and the production deployment. Built the 5-band IDE layout, the file I/O system, and the command palette. Wrote the project plan.',
  },
  {
    initials: 'LC',
    name: 'Landon Clay',
    role: 'Assembler and parser',
    body:
      'Designed the lexer and the two-pass assembler. Made label resolution work, encoded ~50 instructions across R/I/J types, and handled directives, pseudo-instructions, and the data segment layout.',
  },
  {
    initials: 'ZG',
    name: 'Zachary Gass',
    role: 'Simulator and execution',
    body:
      'Built the simulator engine: 32 GPRs plus FPU registers, memory model with .text/.data/stack segments, the step/run loop, syscalls, and the test suite. Wrote 125+ tests verifying correctness against real MARS.',
  },
]

export function OriginStory() {
  return (
    <section
      id="team"
      aria-labelledby="team-heading"
      className="landing-reveal py-24 md:py-32"
      style={{ background: 'var(--l-bg-dark)' }}
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="mono text-[13px] font-medium uppercase" style={{ color: 'var(--l-accent)', letterSpacing: '0.1em' }}>
            The team
          </span>
          <h2
            id="team-heading"
            className="mt-4 text-4xl font-bold leading-tight md:text-5xl"
            style={{ color: 'white' }}
          >
            Three engineers. Six days. One simulator.
          </h2>
          <p className="mt-4 text-lg leading-[1.6]" style={{ color: '#A8B0C0' }}>
            WebMARS is a senior software engineering capstone project. We set out to build a modern, browser-based replacement for MARS — the venerable MIPS simulator from Missouri State — in a single six-day sprint. We shipped on time. Then we kept going.
          </p>
        </div>

        {/* Team cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {TEAM.map((m) => (
            <article
              key={m.name}
              className="flex flex-col rounded-2xl p-8"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                minHeight: 320,
              }}
            >
              <div
                className="flex size-16 items-center justify-center rounded-full text-2xl font-bold"
                style={{ background: 'rgba(34,211,238,0.12)', color: 'var(--l-accent)' }}
                aria-hidden="true"
              >
                {m.initials}
              </div>
              <h3 className="mt-4 text-lg font-bold" style={{ color: 'white' }}>{m.name}</h3>
              <p className="mt-1 text-[13px] font-medium" style={{ color: 'var(--l-accent)' }}>{m.role}</p>
              <p className="mt-4 text-[14px] leading-[1.6]" style={{ color: '#A8B0C0' }}>{m.body}</p>
            </article>
          ))}
        </div>

        {/* Closing */}
        <div className="mx-auto mt-16 max-w-3xl text-center">
          <p className="text-lg leading-[1.6]" style={{ color: '#A8B0C0' }}>
            We built WebMARS because the canonical MARS simulator hadn&rsquo;t meaningfully changed since 2014, and a generation of students shouldn&rsquo;t have to fight Java Swing to learn computer architecture. Everything is open source. The code, the planning docs, the design tokens. Fork it. Improve it. Send a PR.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="rounded-[10px] px-8 py-3 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--l-accent)' }}
            >
              Try the editor →
            </button>
            <a
              href={PRD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[10px] border-2 px-8 py-3 text-base font-semibold transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.16)', color: 'white' }}
            >
              Read the PRD →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
