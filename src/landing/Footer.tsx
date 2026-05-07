import { navigate } from '@/lib/router.ts'
import { REPO_URL } from '@/lib/constants.ts'

// Phase 4 SA-10: 3-column footer with brand, project links, and
// team credits. No fake social links, no fake forum, no fake
// tutorials section. Only references things that genuinely exist.

const PRD_URL    = `${REPO_URL}/blob/main/docs/PRD.md`
const REPORT_URL = `${REPO_URL}/blob/main/docs/FINAL_REPORT.md`

export function Footer() {
  return (
    <footer
      className="pt-16 pb-12"
      style={{ background: '#0A0D12', color: '#A8B0C0' }}
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[2fr_1.2fr_1.2fr]">
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2">
            <span aria-hidden="true" style={{ width: 12, height: 12, background: 'var(--l-accent)', borderRadius: 2 }} />
            <span className="text-xl font-bold" style={{ color: 'white' }}>WebMARS</span>
          </div>
          <p className="mt-3 text-[14px]" style={{ color: '#A8B0C0' }}>
            A modern, browser-based MIPS simulator. Built in 2026.
          </p>
          <p className="mt-2 text-[12px] italic" style={{ color: '#8B95A8' }}>
            Made with TypeScript, React, Vite, Tailwind, Monaco, and Zustand.
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="mt-4 inline-flex size-8 items-center justify-center rounded transition-colors hover:[color:white]"
            style={{ color: '#A8B0C0' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>

        {/* Project column */}
        <div>
          <h3 className="mono text-[12px] font-medium uppercase" style={{ color: 'var(--l-accent)', letterSpacing: '0.08em' }}>
            Project
          </h3>
          <ul className="mt-4 flex flex-col gap-2 text-[14px]">
            <li>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="transition-colors hover:[color:white]"
                style={{ color: '#A8B0C0' }}
              >
                Try the editor
              </button>
            </li>
            <li>
              <a href={REPO_URL}   target="_blank" rel="noopener noreferrer" className="transition-colors hover:[color:white]" style={{ color: '#A8B0C0' }}>GitHub repository</a>
            </li>
            <li>
              <a href={PRD_URL}    target="_blank" rel="noopener noreferrer" className="transition-colors hover:[color:white]" style={{ color: '#A8B0C0' }}>PRD</a>
            </li>
            <li>
              <a href={REPORT_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:[color:white]" style={{ color: '#A8B0C0' }}>Final report</a>
            </li>
          </ul>
        </div>

        {/* Team column */}
        <div>
          <h3 className="mono text-[12px] font-medium uppercase" style={{ color: 'var(--l-accent)', letterSpacing: '0.08em' }}>
            Team
          </h3>
          <ul className="mt-4 flex flex-col gap-2 text-[14px]" style={{ color: '#A8B0C0' }}>
            <li>Bryan Djenabia — UI, integration, deployment</li>
            <li>Landon Clay — Assembler and parser</li>
            <li>Zachary Gass — Simulator and execution</li>
          </ul>
        </div>
      </div>

      <div
        className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t px-6 pt-8 text-center text-[12px] md:flex-row md:items-center md:justify-between"
        style={{ borderColor: 'rgba(255,255,255,0.08)', color: '#8B95A8' }}
      >
        <span>© 2026 Bryan Djenabia, Landon Clay, Zachary Gass.</span>
        <span>MIT licensed.</span>
        <span>Inspired by MARS by Pete Sanderson &amp; Kenneth Vollmar.</span>
      </div>
    </footer>
  )
}
