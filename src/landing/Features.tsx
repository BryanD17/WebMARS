// Phase 4 SA-5: 6 honest features in a 3-column grid. Inline SVG
// icons (no lucide-react dep) — minimal stroke icons that match
// the accent color on hover.

interface Feature {
  title: string
  body: string
  icon: React.ReactNode
}

const FEATURES: ReadonlyArray<Feature> = [
  {
    title: 'Modern MIPS32 + FPU + Cop0',
    body:
      '50+ instructions across arithmetic, logic, branches, jumps, load/store, FPU single-precision, and trap families. Pseudo-instructions like blt, bgt, abs, sge, and move expand to the right encodings.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    title: 'A real debugger, not a runner',
    body:
      'Set breakpoints with one gutter click. Step forward, step backward, watch registers update in real time. Run-to-cursor and a 1–500 instr/s speed slider let you see exactly what your code does.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 2 1.88 1.88" />
        <path d="M14.12 3.88 16 2" />
        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
        <path d="M12 20v-9" />
        <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
        <path d="M6 13H2" />
        <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
        <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
        <path d="M22 13h-4" />
        <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
      </svg>
    ),
  },
  {
    title: 'Built-in tools',
    body:
      'Bitmap display for graphics programs, keyboard / display MMIO for interactive games, IEEE 754 representation editor, instruction counter, memory reference visualization, and a screen magnifier. All in the Tools menu.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    title: 'Files that work',
    body:
      'Open and save .asm files directly from your computer. Multi-file tabs with drag-to-reorder. Examples menu with 8 starter programs. Recent files, find / replace, syntax highlighting, hover docs. Powered by Monaco — the same editor in VS Code.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
  {
    title: 'Zero install',
    body:
      'WebMARS runs entirely in modern browsers. No Java, no JVM, no downloads, no admin permissions. Deploy a link, students start coding.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
  },
  {
    title: 'Built for the classroom',
    body:
      'Modeled after the curriculum-standard MARS simulator from Patterson & Hennessy. 125+ tests verify correctness against real MARS behavior on the v1.0 instruction set. MIT licensed, source on GitHub.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
        <path d="M22 10v6" />
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </svg>
    ),
  },
]

export function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="landing-reveal py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="max-w-3xl">
          <span className="mono text-[13px] font-medium uppercase" style={{ color: 'var(--l-accent)', letterSpacing: '0.1em' }}>
            Everything you need
          </span>
          <h2 id="features-heading" className="mt-4 text-4xl font-bold md:text-5xl" style={{ color: 'var(--l-ink-1)' }}>
            A complete MIPS development toolkit, in one tab.
          </h2>
          <p className="mt-4 text-lg" style={{ color: 'var(--l-ink-2)' }}>
            From writing your first instruction to debugging cache behavior, WebMARS handles the entire learning journey without leaving the browser.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="group flex flex-col rounded-2xl border bg-white p-8 transition-all hover:-translate-y-1"
              style={{ borderColor: 'var(--l-border)', minHeight: 280 }}
            >
              <div
                className="flex size-12 items-center justify-center rounded-xl transition-colors"
                style={{ background: 'var(--l-accent-soft)', color: 'var(--l-accent)' }}
              >
                <span className="size-6 block">{f.icon}</span>
              </div>
              <h3 className="mt-6 text-xl font-bold" style={{ color: 'var(--l-ink-1)' }}>
                {f.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.6]" style={{ color: 'var(--l-ink-2)' }}>
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
