// Phase 4 SA-6: 4 alternating rows that go deep on what WebMARS
// actually does. Each row's visual is a styled inline illustration
// (no real screenshots) — mock IDE chrome with real code, a
// CSS-rendered bitmap grid, multi-file tabs, and team avatars.
// The illustrations match the eventual screenshot dimensions so
// future captures slot in cleanly.

interface Row {
  eyebrow: string
  title: string
  body: string
  imageSide: 'left' | 'right'
  bullets?: ReadonlyArray<string>
  thumbnails?: ReadonlyArray<string>
  cta?: { label: string; onClick: () => void }
  visual: React.ReactNode
}

// Reusable card chrome for the row visuals.
function VisualCard({ children, dark = true }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: dark ? 'var(--l-bg-dark)' : 'white',
        boxShadow: 'var(--l-shadow-lg)',
        border: '1px solid var(--l-border)',
        aspectRatio: '4 / 3',
      }}
    >
      {children}
    </div>
  )
}

function DebuggerVisual() {
  // Mock editor with a breakpoint dot, a flashing register, and a
  // step indicator — communicates the debug story without a real
  // capture.
  return (
    <VisualCard>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1a1d24' }}>
        <span className="size-3 rounded-full" style={{ background: '#FF5F57' }} />
        <span className="size-3 rounded-full" style={{ background: '#FEBC2E' }} />
        <span className="size-3 rounded-full" style={{ background: '#28C840' }} />
        <span className="ml-3 mono text-[12px]" style={{ color: '#A8B0C0' }}>syscallIO.asm</span>
        <span className="ml-auto rounded px-2 py-0.5 mono text-[10px]" style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--l-accent)' }}>
          PAUSED · step 7
        </span>
      </div>
      <div className="grid h-full grid-cols-[24px_1fr_200px]" style={{ background: 'var(--l-bg-dark)' }}>
        {/* Gutter with breakpoint */}
        <div className="flex flex-col items-center gap-3 border-r py-4 mono text-[10px]" style={{ borderColor: '#2A2F3A', color: '#5A6378' }}>
          {[1,2,3,4,5,6,7].map((n) => (
            <div key={n} className="relative">
              {n === 4 && <span aria-hidden="true" className="absolute -left-2 top-0 size-2 rounded-full" style={{ background: '#EF4444' }} />}
              {n}
            </div>
          ))}
        </div>
        {/* Source */}
        <div className="px-4 py-4 mono text-[12px] leading-6" style={{ color: '#E2E5EC' }}>
          <div><span style={{ color: '#7DD3FC' }}>main:</span></div>
          <div>{'  '}<span style={{ color: '#22D3EE' }}>li</span> $v0, <span style={{ color: '#FFB020' }}>5</span></div>
          <div>{'  '}<span style={{ color: '#22D3EE' }}>syscall</span></div>
          <div className="rounded" style={{ background: 'rgba(34,211,238,0.10)' }}>{'  '}<span style={{ color: '#22D3EE' }}>move</span> $t0, $v0</div>
          <div>{'  '}<span style={{ color: '#22D3EE' }}>li</span> $v0, <span style={{ color: '#FFB020' }}>1</span></div>
          <div>{'  '}<span style={{ color: '#22D3EE' }}>move</span> $a0, $t0</div>
          <div>{'  '}<span style={{ color: '#22D3EE' }}>syscall</span></div>
        </div>
        {/* Register sidebar with one flashing */}
        <div className="border-l p-3 mono text-[11px]" style={{ borderColor: '#2A2F3A', color: '#A8B0C0' }}>
          <div className="mb-2 uppercase text-[10px]" style={{ color: '#5A6378', letterSpacing: '0.1em' }}>Registers</div>
          <div className="flex justify-between"><span>$v0</span><span style={{ color: '#22D3EE' }}>0x00000005</span></div>
          <div className="-mx-2 flex justify-between rounded px-2 py-0.5" style={{ background: 'rgba(34,211,238,0.20)' }}><span>$t0</span><span style={{ color: '#22D3EE' }}>0x00000005</span></div>
          <div className="flex justify-between"><span>$a0</span><span>0x00000000</span></div>
          <div className="flex justify-between"><span>PC</span><span>0x0040000C</span></div>
        </div>
      </div>
    </VisualCard>
  )
}

function BitmapVisual() {
  // 8x8 grid rendering the smile from bitmapSmile.asm — same
  // pattern, rendered in CSS.
  const Y = '#FFFF00'
  const K = '#000000'
  const grid = [
    [K,K,K,K,K,K,K,K],
    [K,Y,K,K,K,K,Y,K],
    [K,Y,K,K,K,K,Y,K],
    [K,K,K,K,K,K,K,K],
    [K,K,K,K,K,K,K,K],
    [Y,K,K,K,K,K,K,Y],
    [K,Y,Y,Y,Y,Y,Y,K],
    [K,K,K,K,K,K,K,K],
  ]
  return (
    <VisualCard>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1a1d24' }}>
        <span aria-hidden="true">▦</span>
        <span className="mono text-[12px]" style={{ color: '#A8B0C0' }}>Bitmap Display · 8 × 8 · base 0x10010000</span>
      </div>
      <div className="flex h-full items-center justify-center p-6" style={{ background: '#0a0d12' }}>
        <div
          className="grid gap-0"
          style={{ gridTemplateColumns: 'repeat(8, 28px)', gridTemplateRows: 'repeat(8, 28px)', boxShadow: '0 0 60px rgba(34,211,238,0.15)' }}
          role="img"
          aria-label="A yellow smile face on a black background, drawn into memory by bitmapSmile.asm"
        >
          {grid.flat().map((c, i) => (
            <div key={i} style={{ background: c }} />
          ))}
        </div>
      </div>
    </VisualCard>
  )
}

function MultiFileVisual() {
  const tabs = [
    { name: 'arraySum.asm',   active: false, modified: false },
    { name: 'factorial.asm',  active: true,  modified: true  },
    { name: 'sumToN.asm',     active: false, modified: false },
  ]
  return (
    <VisualCard>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1a1d24' }}>
        <span className="size-3 rounded-full" style={{ background: '#FF5F57' }} />
        <span className="size-3 rounded-full" style={{ background: '#FEBC2E' }} />
        <span className="size-3 rounded-full" style={{ background: '#28C840' }} />
      </div>
      <div className="flex items-stretch border-b" style={{ background: '#11141a', borderColor: '#2A2F3A' }}>
        {tabs.map((t) => (
          <div
            key={t.name}
            className="flex items-center gap-2 border-r px-4 py-2 mono text-[12px]"
            style={{
              borderColor: '#2A2F3A',
              background: t.active ? 'var(--l-bg-dark)' : 'transparent',
              color: t.active ? 'white' : '#A8B0C0',
            }}
          >
            {t.modified && <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: 'var(--l-warn)' }} />}
            {t.name}
          </div>
        ))}
        <div className="flex items-center px-3 mono text-base" style={{ color: '#5A6378' }}>+</div>
      </div>
      <div className="px-4 py-4 mono text-[12px] leading-6" style={{ background: 'var(--l-bg-dark)', color: '#E2E5EC' }}>
        <div><span style={{ color: '#7DD3FC' }}>factorial:</span></div>
        <div>{'  '}<span style={{ color: '#22D3EE' }}>addi</span> $sp, $sp, <span style={{ color: '#FFB020' }}>-8</span></div>
        <div>{'  '}<span style={{ color: '#22D3EE' }}>sw</span> $ra, <span style={{ color: '#FFB020' }}>0</span>($sp)</div>
        <div>{'  '}<span style={{ color: '#22D3EE' }}>sw</span> $a0, <span style={{ color: '#FFB020' }}>4</span>($sp)</div>
        <div>{'  '}<span style={{ color: '#22D3EE' }}>blt</span> $a0, <span style={{ color: '#FFB020' }}>2</span>, base</div>
      </div>
    </VisualCard>
  )
}

function TeamVisual() {
  // Three avatar circles + name labels in a card. Uses the same
  // initials and roles as the OriginStory section.
  const members = [
    { initials: 'BD', name: 'Bryan',  role: 'UI · Integration' },
    { initials: 'LC', name: 'Landon', role: 'Assembler · Parser' },
    { initials: 'ZG', name: 'Zach',   role: 'Simulator · Tests' },
  ]
  return (
    <VisualCard>
      <div className="flex h-full flex-col justify-center px-8 py-10" style={{ background: 'var(--l-bg-dark)' }}>
        <div className="mono text-[11px] uppercase" style={{ color: 'var(--l-accent)', letterSpacing: '0.1em' }}>
          The team · 6-day sprint
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          {members.map((m) => (
            <div key={m.name} className="flex flex-col items-center gap-2">
              <div
                className="flex size-20 items-center justify-center rounded-full text-2xl font-bold"
                style={{ background: 'rgba(34,211,238,0.15)', color: 'var(--l-accent)' }}
                aria-hidden="true"
              >
                {m.initials}
              </div>
              <div className="text-base font-bold" style={{ color: 'white' }}>{m.name}</div>
              <div className="mono text-[11px]" style={{ color: '#A8B0C0' }}>{m.role}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center text-[13px]" style={{ color: '#A8B0C0' }}>
          Modeled after MARS · Built in TypeScript · 125+ tests
        </div>
      </div>
    </VisualCard>
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
    visual: <DebuggerVisual />,
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
    visual: <BitmapVisual />,
  },
  {
    eyebrow: 'Real files',
    title: 'Save your work. Load other people’s.',
    body:
      'WebMARS uses the File System Access API to give you native open and save dialogs in supported browsers. Open .asm files from disk, edit them, save back. Open multiple files as tabs. No cloud, no account, no sync — your files stay on your machine.',
    imageSide: 'left',
    visual: <MultiFileVisual />,
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
    visual: <TeamVisual />,
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
                  {row.visual}
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

