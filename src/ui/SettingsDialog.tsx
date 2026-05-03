import { useEffect, useRef, useState } from 'react'
import {
  useSimulator,
  THEMES,
  EDITOR_FONT_MIN,
  EDITOR_FONT_MAX,
  EDITOR_FONT_STEP,
  type ThemeName,
} from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

type Tab = 'appearance' | 'editor' | 'simulator'

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'editor',     label: 'Editor'     },
  { id: 'simulator',  label: 'Simulator'  },
]

const THEME_LABELS: Record<ThemeName, { title: string; sub: string }> = {
  dark:  { title: 'Dark',           sub: 'Default. Low-contrast surfaces, cyan accent.' },
  light: { title: 'Light',          sub: 'Inverted shell. Editor stays on the dark Monaco theme.' },
  hc:    { title: 'High contrast',  sub: 'Pure-black + max ink. WCAG AAA on shell chrome.' },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-4 border-b border-divider/60 last:border-b-0">
      <h3
        className="mb-3 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-sm px-2 py-2 transition-colors',
        'hover:bg-surface-2',
        disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 flex-none accent-accent"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 text-xs text-ink-1">
          {label}
          {badge && (
            <span
              className="rounded-sm bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-3"
              style={{ letterSpacing: '0.04em' }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-3">{description}</div>
      </div>
    </label>
  )
}

export function SettingsDialog() {
  const open               = useSimulator((s) => s.settingsDialogOpen)
  const closeSettings      = useSimulator((s) => s.closeSettings)
  const theme              = useSimulator((s) => s.theme)
  const setTheme           = useSimulator((s) => s.setTheme)
  const editorFontSize     = useSimulator((s) => s.editorFontSize)
  const setEditorFontSize  = useSimulator((s) => s.setEditorFontSize)
  const simSettings        = useSimulator((s) => s.simSettings)
  const setSimSetting      = useSimulator((s) => s.setSimSetting)

  const [tab, setTab] = useState<Tab>('appearance')
  const dialogRef = useRef<HTMLDivElement>(null)

  // Esc closes; click outside the dialog body (the backdrop) closes.
  // Trap initial focus on the dialog so screen readers + keyboard
  // users land inside the modal instead of behind it.
  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeSettings()
    }
    window.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, closeSettings])

  if (!open) return null

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeSettings()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        className={cn(
          'flex h-[34rem] w-[44rem] flex-col overflow-hidden rounded-lg border border-divider bg-surface-1 shadow-xl',
          'focus-visible:outline-none',
        )}
      >
        <header className="flex h-10 flex-none items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-2 text-sm text-ink-1">
            <span aria-hidden="true">⚙</span>
            Settings
          </div>
          <button
            type="button"
            onClick={closeSettings}
            aria-label="Close settings"
            title="Close (Esc)"
            className="rounded-sm px-2 py-0.5 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            ×
          </button>
        </header>

        <div className="flex flex-1 min-h-0">
          <nav
            aria-label="Settings tabs"
            className="flex w-44 flex-none flex-col border-r border-divider bg-surface-2 py-2"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex h-8 items-center px-4 text-left text-xs transition-colors',
                  'focus-visible:outline-none focus-visible:bg-surface-3',
                  tab === t.id
                    ? 'bg-surface-3 text-ink-1'
                    : 'text-ink-2 hover:bg-surface-3 hover:text-ink-1',
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto">
            {tab === 'appearance' && (
              <Section title="Theme">
                <div className="flex flex-col gap-2">
                  {THEMES.map((t) => (
                    <label
                      key={t}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-sm border px-3 py-2 transition-colors',
                        theme === t
                          ? 'border-accent bg-surface-2'
                          : 'border-divider hover:bg-surface-2',
                      )}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={t}
                        checked={theme === t}
                        onChange={() => setTheme(t)}
                        className="mt-0.5 size-4 flex-none accent-accent"
                      />
                      <div className="flex-1">
                        <div className="text-xs text-ink-1">{THEME_LABELS[t].title}</div>
                        <div className="mt-0.5 text-[11px] text-ink-3">
                          {THEME_LABELS[t].sub}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] italic text-ink-3">
                  Monaco's editor theme is dark in every mode — light /
                  HC swap shell chrome only. A matching editor theme
                  lands when the language registration is refactored.
                </p>
              </Section>
            )}

            {tab === 'editor' && (
              <Section title="Editor">
                <div className="flex items-center gap-3">
                  <span
                    className="w-24 flex-none font-mono text-[10px] uppercase text-ink-3"
                    style={{ letterSpacing: '0.06em' }}
                  >
                    Font size
                  </span>
                  <input
                    type="range"
                    min={EDITOR_FONT_MIN}
                    max={EDITOR_FONT_MAX}
                    step={EDITOR_FONT_STEP}
                    value={editorFontSize}
                    onChange={(event) => setEditorFontSize(Number(event.target.value))}
                    aria-label={`Editor font size: ${editorFontSize}px`}
                    className="h-1 flex-1 cursor-pointer accent-accent"
                  />
                  <span
                    className="w-12 flex-none font-mono text-[11px] tabular-nums text-ink-2"
                    style={{ letterSpacing: '0.04em' }}
                  >
                    {editorFontSize}px
                  </span>
                </div>
                <p
                  className="font-mono text-[11px] text-ink-2"
                  style={{ fontSize: `${editorFontSize}px`, lineHeight: 1.4 }}
                >
                  add $t0, $t1, $t2  # preview
                </p>
              </Section>
            )}

            {tab === 'simulator' && (
              <>
                <Section title="Simulator behaviour">
                  <Toggle
                    label="Delayed branching"
                    description="Execute the instruction immediately after a branch (real-MIPS branch-delay slot). Most course material assumes this is OFF."
                    checked={simSettings.delayedBranching}
                    onChange={(v) => setSimSetting('delayedBranching', v)}
                  />
                  <Toggle
                    label="FPU ($f0–$f31) panel"
                    description="Show the coprocessor 1 register file in the right panel. Requires Phase 2B engine support."
                    checked={simSettings.coproc01Panels}
                    onChange={(v) => setSimSetting('coproc01Panels', v)}
                  />
                  <Toggle
                    label="Self-modifying code allowed"
                    description="Permit stores to the .text segment. Off by default — most programs hit this by accident."
                    checked={simSettings.selfModifyingCode}
                    onChange={(v) => setSimSetting('selfModifyingCode', v)}
                  />
                </Section>
                <Section title="Notes">
                  <p className="text-[11px] text-ink-3">
                    Phase 2A ships these toggles with no engine-side
                    effect — your selection persists so it applies the
                    moment the corresponding phase lands. Each
                    toggle's badge points at the phase that wires it.
                  </p>
                </Section>
              </>
            )}
          </div>
        </div>

        <footer className="flex h-10 flex-none items-center justify-end border-t border-divider bg-surface-1 px-4">
          <button
            type="button"
            onClick={closeSettings}
            className="rounded-sm bg-surface-2 px-3 py-1 text-xs text-ink-1 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
