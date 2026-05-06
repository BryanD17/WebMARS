import { navigate } from '@/lib/router.ts'
import { REPO_URL } from '@/lib/constants.ts'

// Phase 4 SA-3 hero. 720px tall on desktop, two columns. Headline
// copy is honest about what WebMARS is: a student-built, open-source
// MIPS development environment that runs in the browser. No fake
// adoption claims; trust signals reference real numbers (test count,
// license, build duration).

export function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        // Faint memory-address grid pattern at 5% opacity. Pure
        // SVG so we don't ship an extra image asset for the hero.
        background:
          'linear-gradient(0deg, var(--l-bg) 0%, var(--l-bg) 100%), ' +
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><path d='M 80 0 L 0 0 0 80' fill='none' stroke='%2322D3EE' stroke-width='1' opacity='0.08'/></svg>\")",
        backgroundBlendMode: 'normal',
      }}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-[60%_40%] md:py-28 md:min-h-[720px]">
        {/* LEFT — copy */}
        <div className="flex flex-col">
          <span
            className="mono text-[13px] font-medium uppercase"
            style={{ color: 'var(--l-accent)', letterSpacing: '0.1em' }}
          >
            Free · Open source · No install
          </span>
          <h1
            className="mt-4 max-w-[540px] text-5xl font-bold leading-[1.1] md:text-6xl"
            style={{ color: 'var(--l-ink-1)' }}
          >
            A modern MIPS simulator that runs in your browser.
          </h1>
          <p
            className="mt-6 max-w-[520px] text-lg leading-[1.5] md:text-xl"
            style={{ color: 'var(--l-ink-2)' }}
          >
            WebMARS is a complete MIPS development environment — assembler,
            simulator, debugger, and visual tools — running entirely in your
            browser. No Java, no install, no setup. Built by three students.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="group flex items-center justify-center gap-2 rounded-[10px] px-8 text-base font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{
                  background: 'var(--l-accent)',
                  height: 56,
                  boxShadow: '0 8px 24px rgba(34,211,238,0.25)',
                }}
              >
                Open the editor
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
              <span className="mt-2 text-[13px]" style={{ color: 'var(--l-ink-3)' }}>
                Works in any modern browser. No account needed.
              </span>
            </div>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-[10px] border-2 px-8 text-base font-semibold transition-colors"
              style={{
                borderColor: 'var(--l-border)',
                color: 'var(--l-ink-1)',
                height: 56,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              View on GitHub
            </a>
          </div>

          {/* Trust signals — real numbers only */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px]" style={{ color: 'var(--l-ink-2)' }}>
            <span>100+ tests passing</span>
            <span aria-hidden="true">·</span>
            <span>MIT licensed</span>
            <span aria-hidden="true">·</span>
            <span>Built in 6 days</span>
          </div>
        </div>

        {/* RIGHT — hero visual placeholder. SA-11 swaps this for a
           real screenshot. The placeholder card matches the eventual
           dimensions so layout doesn't shift. */}
        <div className="relative">
          <div
            className="hero-visual-float relative mx-auto overflow-hidden"
            style={{
              width: '100%',
              maxWidth: 600,
              aspectRatio: '5 / 4',
              borderRadius: 16,
              boxShadow: 'var(--l-shadow-xl)',
              background: 'var(--l-bg-dark)',
            }}
            role="img"
            aria-label="WebMARS editor with a Hello-MIPS program loaded, register table on the right showing live values"
          >
            {/* Mock IDE chrome so the placeholder looks intentional */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#1a1d24' }}>
              <span className="size-3 rounded-full" style={{ background: '#FF5F57' }} />
              <span className="size-3 rounded-full" style={{ background: '#FEBC2E' }} />
              <span className="size-3 rounded-full" style={{ background: '#28C840' }} />
              <span className="ml-3 mono text-[12px]" style={{ color: '#A8B0C0' }}>hello.asm</span>
            </div>
            <div className="grid h-full grid-cols-[1fr_220px]">
              <div className="p-5 mono text-[13px] leading-6" style={{ color: '#E2E5EC' }}>
                <span style={{ color: '#7DD3FC' }}>main:</span><br/>
                {'  '}<span style={{ color: '#22D3EE' }}>li</span> $v0, <span style={{ color: '#FFB020' }}>4</span><br/>
                {'  '}<span style={{ color: '#22D3EE' }}>la</span> $a0, msg<br/>
                {'  '}<span style={{ color: '#22D3EE' }}>syscall</span><br/><br/>
                {'  '}<span style={{ color: '#22D3EE' }}>li</span> $v0, <span style={{ color: '#FFB020' }}>10</span><br/>
                {'  '}<span style={{ color: '#22D3EE' }}>syscall</span>
              </div>
              <div className="border-l p-3 mono text-[11px]" style={{ borderColor: '#2A2F3A', color: '#A8B0C0' }}>
                <div className="mb-2 uppercase text-[10px]" style={{ color: '#5A6378', letterSpacing: '0.1em' }}>Registers</div>
                <div className="flex justify-between"><span>$zero</span><span>0x00000000</span></div>
                <div className="flex justify-between"><span>$v0</span><span style={{ color: '#22D3EE' }}>0x00000004</span></div>
                <div className="flex justify-between"><span>$a0</span><span>0x10010000</span></div>
                <div className="flex justify-between"><span>$sp</span><span>0x7FFFEFFC</span></div>
                <div className="flex justify-between"><span>PC</span><span>0x0040000C</span></div>
              </div>
            </div>
          </div>

          {/* Floating callouts — desktop only */}
          <div
            className="hidden md:block absolute -right-2 top-8 rounded-lg p-3 text-[12px] font-medium"
            style={{ background: 'white', boxShadow: 'var(--l-shadow-md)', color: 'var(--l-ink-1)' }}
          >
            ↗ Live register flash
          </div>
          <div
            className="hidden md:block absolute -left-2 bottom-8 rounded-lg p-3 text-[12px] font-medium"
            style={{ background: 'white', boxShadow: 'var(--l-shadow-md)', color: 'var(--l-ink-1)' }}
          >
            ↙ Click gutter to set breakpoint
          </div>
        </div>
      </div>
    </section>
  )
}
