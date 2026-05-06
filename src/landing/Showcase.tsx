// Phase 4 SA-6: 4 alternating rows that go deep on what WebMARS
// actually does. Screenshots are placeholder mocks until SA-11
// captures real ones from the live deploy. Each row alternates
// image/text orientation: left/right/left/right.

interface Row {
  eyebrow: string
  title: string
  body: string
  imageSide: 'left' | 'right'
  bullets?: ReadonlyArray<string>
  thumbnails?: ReadonlyArray<string>
  cta?: { label: string; onClick: () => void }
  imagePlaceholder: React.ReactNode
}

function MockScreenshot({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <div
      className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl mono text-sm"
      style={{
        background: accent ? 'var(--l-bg-dark)' : 'var(--l-bg-alt)',
        color: accent ? 'var(--l-accent)' : 'var(--l-ink-3)',
        boxShadow: 'var(--l-shadow-lg)',
        border: '1px solid var(--l-border)',
      }}
    >
      {label}
    </div>
  )
}

const ROWS: ReadonlyArray<Row> = [
  {
    eyebrow: 'Debugging',
    title: 'Time-travel through your code.',
    body:
      'Set breakpoints with a single click in the gutter. Step forward through your program one instruction at a time, or use Backstep to undo. Watch registers highlight as they change and the console fill in real time.',
    imageSide: 'left',
    bullets: [
      'Click-to-toggle gutter breakpoints',
      'Forward and backward stepping',
      'Live register-change highlighting',
      'Adjustable execution speed (1 to 500 instr/s)',
      'Run-to-cursor',
    ],
    imagePlaceholder: <MockScreenshot label="[ debugger screenshot — SA-11 ]" accent />,
  },
  {
    eyebrow: 'Visual tools',
    title: 'See inside the processor.',
    body:
      'WebMARS includes a Tools menu with the same kind of visual aids that make MARS so effective for teaching. Bitmap displays, MMIO simulators, IEEE 754 editors — all wired directly into the simulator state.',
    imageSide: 'right',
    thumbnails: [
      'Bitmap Display',
      'Keyboard MMIO',
      'FP Representation',
      'Instruction Counter',
      'Memory Ref Viz',
      'Screen Magnifier',
    ],
    imagePlaceholder: <MockScreenshot label="[ Bitmap Display — SA-11 ]" accent />,
  },
  {
    eyebrow: 'Real files',
    title: 'Save your work. Load other people’s.',
    body:
      'WebMARS uses the File System Access API to give you native open and save dialogs in supported browsers. Open .asm files from disk, edit them, save back. Open multiple files as tabs. No cloud, no account, no sync — your files stay on your machine.',
    imageSide: 'left',
    imagePlaceholder: <MockScreenshot label="[ multi-file tabs — SA-11 ]" />,
  },
  {
    eyebrow: 'Built by students',
    title: 'A class project that became a real tool.',
    body:
      'Three software engineering students set out to build a modern MIPS simulator in six days. The result was WebMARS: a full IDE with assembler, simulator, debugger, FPU, file I/O, and visual tools. Open source, MIT licensed, free to use forever.',
    imageSide: 'right',
    cta: {
      label: 'Read the story →',
      onClick: () => {
        const target = document.getElementById('team')
        if (target) target.scrollIntoView({ behavior: 'smooth' })
      },
    },
    imagePlaceholder: <MockScreenshot label="[ team graphic — SA-11 ]" />,
  },
]

export function Showcase() {
  return (
    <section id="showcase" aria-labelledby="showcase-heading" className="landing-reveal py-24 md:py-32" style={{ background: 'var(--l-bg-alt)' }}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <span className="mono text-[13px] font-medium uppercase" style={{ color: 'var(--l-accent)', letterSpacing: '0.1em' }}>
            See it in action
          </span>
          <h2 id="showcase-heading" className="mt-4 text-4xl font-bold md:text-5xl" style={{ color: 'var(--l-ink-1)' }}>
            Built for how you actually learn assembly.
          </h2>
        </div>

        <div className="mt-20 flex flex-col gap-24 md:gap-32">
          {ROWS.map((row, i) => {
            const imageFirst = row.imageSide === 'left'
            return (
              <article
                key={i}
                className="grid items-center gap-10 md:grid-cols-2 md:gap-16"
              >
                <div className={imageFirst ? 'md:order-1' : 'md:order-2'}>
                  {row.imagePlaceholder}
                </div>

                <div className={imageFirst ? 'md:order-2' : 'md:order-1'}>
                  <span className="mono text-[12px] font-medium uppercase" style={{ color: 'var(--l-accent)', letterSpacing: '0.1em' }}>
                    {row.eyebrow}
                  </span>
                  <h3 className="mt-3 text-3xl font-bold md:text-4xl" style={{ color: 'var(--l-ink-1)' }}>
                    {row.title}
                  </h3>
                  <p className="mt-4 text-lg leading-[1.6]" style={{ color: 'var(--l-ink-2)' }}>
                    {row.body}
                  </p>

                  {row.bullets && (
                    <ul className="mt-6 flex flex-col gap-3">
                      {row.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-3 text-[15px]" style={{ color: 'var(--l-ink-1)' }}>
                          <span aria-hidden="true" style={{ color: 'var(--l-success)' }}>✓</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {row.thumbnails && (
                    <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                      {row.thumbnails.map((t) => (
                        <div
                          key={t}
                          className="flex size-[120px] flex-none flex-col items-center justify-center rounded-lg border bg-white p-2 text-center text-[11px] font-medium"
                          style={{ borderColor: 'var(--l-border)', color: 'var(--l-ink-2)' }}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  )}

                  {row.cta && (
                    <button
                      type="button"
                      onClick={row.cta.onClick}
                      className="mt-6 text-base font-semibold transition-opacity hover:opacity-80"
                      style={{ color: 'var(--l-accent)' }}
                    >
                      {row.cta.label}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

