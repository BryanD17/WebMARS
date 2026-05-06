import { useState } from 'react'
import { navigate } from '@/lib/router.ts'
import { REPO_URL, ISSUES_URL } from '@/lib/constants.ts'

// Phase 4 SA-9: closing section. Gradient background with a white
// CTA card, copy-to-clipboard helper for the live URL, and three
// real secondary links underneath.

const PRD_URL = `${REPO_URL}/blob/main/docs/PRD.md`
const APP_URL = 'https://www.webmarsimulator.com/app'

export function FinalCTA() {
  const [copied, setCopied] = useState(false)

  function copyUrl(): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    void navigator.clipboard.writeText(APP_URL).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <section
      aria-labelledby="cta-heading"
      className="landing-reveal py-32"
      style={{ background: 'linear-gradient(135deg, var(--l-accent) 0%, var(--l-accent-dark) 100%)' }}
    >
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 id="cta-heading" className="text-4xl font-bold md:text-5xl" style={{ color: 'white' }}>
          Ready to write some MIPS?
        </h2>
        <p className="mt-4 text-lg" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Open WebMARS in your browser. No download, no account, no friction. Type your first instruction in 10 seconds.
        </p>

        {/* CTA card */}
        <div
          className="mx-auto mt-8 flex w-full max-w-[600px] flex-col gap-4 rounded-2xl p-10 text-left"
          style={{ background: 'white', boxShadow: 'var(--l-shadow-xl)' }}
        >
          <h3 className="text-xl font-bold" style={{ color: 'var(--l-ink-1)' }}>
            Start at the URL.
          </h3>

          <div className="flex items-center gap-2 rounded-lg border bg-[var(--l-bg-alt)] px-3 py-2" style={{ borderColor: 'var(--l-border)' }}>
            <span className="mono flex-1 truncate text-[13px]" style={{ color: 'var(--l-accent)' }}>
              {APP_URL}
            </span>
            <button
              type="button"
              onClick={copyUrl}
              aria-label={copied ? 'URL copied' : 'Copy URL'}
              className="rounded px-2 py-1 text-[12px] font-medium transition-colors hover:bg-white"
              style={{ color: 'var(--l-ink-2)' }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/app')}
            className="mt-2 w-full rounded-[10px] px-8 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--l-accent)', height: 56 }}
          >
            Open the editor →
          </button>

          <p className="text-[12px]" style={{ color: 'var(--l-ink-3)' }}>
            Works in Chrome, Edge, Firefox, Safari. Recommended: Chromium-based browsers for File System Access API support.
          </p>

          <hr style={{ borderColor: 'var(--l-border)' }} />

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[14px]" style={{ color: 'var(--l-ink-2)' }}>
            <a href={REPO_URL}    target="_blank" rel="noopener noreferrer" className="transition-colors hover:[color:var(--l-accent)]">View on GitHub</a>
            <span aria-hidden="true">·</span>
            <a href={PRD_URL}     target="_blank" rel="noopener noreferrer" className="transition-colors hover:[color:var(--l-accent)]">Read the PRD</a>
            <span aria-hidden="true">·</span>
            <a href={ISSUES_URL}  target="_blank" rel="noopener noreferrer" className="transition-colors hover:[color:var(--l-accent)]">Report a bug</a>
          </div>
        </div>

        <p className="mt-6 text-[14px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
          WebMARS is free and open source. MIT licensed.
        </p>
      </div>
    </section>
  )
}
