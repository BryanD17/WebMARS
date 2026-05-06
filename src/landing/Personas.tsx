import { navigate } from '@/lib/router.ts'
import { REPO_URL } from '@/lib/constants.ts'

// Phase 4 SA-7: who WebMARS is for. Three honest personas with
// real bullets and CTAs that go to real destinations.

const PRD_URL = `${REPO_URL}/blob/main/docs/PRD.md`

interface Persona {
  title: string
  body: string
  bullets: ReadonlyArray<string>
  cta: { label: string; onClick: () => void }
  icon: React.ReactNode
}

const PERSONAS: ReadonlyArray<Persona> = [
  {
    title: 'Students',
    body:
      'Learn MIPS without fighting Java installs or Swing UIs. Open the URL on your laptop in class, on your phone on the bus, on a friend’s machine in the lab. Your code runs the same everywhere.',
    bullets: [
      'Pre-loaded examples to get unstuck',
      'Hover any instruction for the docs',
      'Breakpoints when you can’t find your bug',
    ],
    cta: { label: 'Open the editor →', onClick: () => navigate('/app') },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
        <path d="M22 10v6" />
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </svg>
    ),
  },
  {
    title: 'Educators',
    body:
      'Send a link instead of an installer. WebMARS works on any browser, any OS, any device — no IT tickets, no Java versions, no JAR downloads. Same simulator behavior as the canonical MARS.',
    bullets: [
      'One URL works for the whole class',
      '8 example programs out of the box',
      'Open source (MIT) — fork it, customize it',
    ],
    cta: { label: 'View on GitHub →', onClick: () => window.open(REPO_URL, '_blank', 'noopener,noreferrer') },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    title: 'Tinkerers',
    body:
      'Built in TypeScript on top of Monaco and Zustand. Documented, tested, and architected for extension. Add a new instruction, write a new tool, fork the whole thing. The codebase is small enough to read in a weekend.',
    bullets: [
      'Fully typed TypeScript codebase',
      '125+ tests as documentation',
      'Designed for extension',
    ],
    cta: { label: 'Read the architecture →', onClick: () => window.open(PRD_URL, '_blank', 'noopener,noreferrer') },
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
]

export function Personas() {
  return (
    <section id="personas" aria-labelledby="personas-heading" className="landing-reveal py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <span className="mono text-[13px] font-medium uppercase" style={{ color: 'var(--l-accent)', letterSpacing: '0.1em' }}>
            Who uses WebMARS
          </span>
          <h2 id="personas-heading" className="mt-4 text-4xl font-bold md:text-5xl" style={{ color: 'var(--l-ink-1)' }}>
            Whoever&rsquo;s learning MIPS, this is built for you.
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {PERSONAS.map((p) => (
            <article
              key={p.title}
              className="flex flex-col rounded-2xl border bg-white p-10 transition-all hover:-translate-y-1"
              style={{ borderColor: 'var(--l-border)', minHeight: 420 }}
            >
              <div
                className="flex size-12 items-center justify-center rounded-xl"
                style={{ background: 'var(--l-accent-soft)', color: 'var(--l-accent)' }}
              >
                <span className="size-6 block">{p.icon}</span>
              </div>
              <h3 className="mt-6 text-2xl font-bold" style={{ color: 'var(--l-ink-1)' }}>
                {p.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.6]" style={{ color: 'var(--l-ink-2)' }}>
                {p.body}
              </p>
              <ul className="mt-5 flex flex-col gap-2">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[14px]" style={{ color: 'var(--l-ink-1)' }}>
                    <span aria-hidden="true" style={{ color: 'var(--l-success)' }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={p.cta.onClick}
                className="mt-auto pt-6 text-left text-[15px] font-semibold transition-opacity hover:opacity-80"
                style={{ color: 'var(--l-accent)' }}
              >
                {p.cta.label}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
