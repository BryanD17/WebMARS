import { useEffect, useMemo, useRef } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { MNEMONICS } from '@/lib/mipsLanguage.ts'
import { cn } from './cn.ts'

const MNEMONIC_SET = new Set<string>(MNEMONICS as ReadonlyArray<string>)

interface CountEntry {
  mnemonic: string
  count: number
}

// Static analysis — counts each known mnemonic in the source. Strips
// comments first (#…), then for every line takes the first token after
// optional label and indentation. Case-insensitive (real MIPS treats
// mnemonics that way), but the result is normalized to lowercase to
// match the MNEMONIC_SET keys.
function countMnemonics(source: string): CountEntry[] {
  const counts = new Map<string, number>()
  for (const rawLine of source.split('\n')) {
    const line = rawLine.split('#')[0] ?? ''
    // Trim leading whitespace; if there's a label (foo:) skip past it.
    const afterLabel = line.replace(/^\s*[A-Za-z_][\w.]*\s*:/, '')
    const trimmed = afterLabel.trim()
    if (trimmed.length === 0) continue
    const firstToken = trimmed.split(/[\s,()]/)[0]
    if (!firstToken) continue
    if (firstToken.startsWith('.')) continue   // directives
    const mnemonic = firstToken.toLowerCase()
    if (!MNEMONIC_SET.has(mnemonic)) continue
    counts.set(mnemonic, (counts.get(mnemonic) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([mnemonic, count]) => ({ mnemonic, count }))
    .sort((a, b) => b.count - a.count || a.mnemonic.localeCompare(b.mnemonic))
}

export function InstructionCounter() {
  const open      = useSimulator((s) => s.toolsDialog === 'instructionCounter')
  const closeTool = useSimulator((s) => s.closeTool)
  const source    = useSimulator((s) => s.source)
  const program   = useSimulator((s) => s.program)
  const executed  = useSimulator((s) => s.instructionsExecuted)

  const dialogRef = useRef<HTMLDivElement>(null)
  const entries = useMemo(() => countMnemonics(source), [source])
  const max = entries[0]?.count ?? 1

  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeTool()
    }
    window.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, closeTool])

  if (!open) return null

  const totalStatic = entries.reduce((acc, e) => acc + e.count, 0)
  const programInstrs = program?.instructions.length ?? 0

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeTool()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Instruction Counter"
        tabIndex={-1}
        className={cn(
          'flex h-[34rem] w-[40rem] flex-col overflow-hidden rounded-lg border border-divider bg-surface-1 shadow-xl',
          'focus-visible:outline-none',
        )}
      >
        <header className="flex h-10 flex-none items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-2 text-sm text-ink-1">
            <span aria-hidden="true">⌗</span>
            Instruction Counter
          </div>
          <button
            type="button"
            onClick={closeTool}
            aria-label="Close"
            title="Close (Esc)"
            className="rounded-sm px-2 py-0.5 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            ×
          </button>
        </header>

        <div className="grid flex-none grid-cols-3 gap-px border-b border-divider bg-divider">
          <Stat label="Source mnemonics"      value={totalStatic} />
          <Stat label="Assembled instructions" value={programInstrs} hint={program ? null : '(not assembled)'} />
          <Stat label="Executed at runtime"   value={executed} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="px-5 py-4 text-xs italic text-ink-3">
              No recognized MIPS mnemonics in the active source.
            </div>
          ) : (
            <ul className="divide-y divide-divider/40">
              {entries.map((entry) => {
                const pct = (entry.count / max) * 100
                return (
                  <li key={entry.mnemonic} className="flex items-center gap-3 px-5 py-1.5">
                    <span className="w-20 flex-none font-mono text-[11px] font-semibold text-accent">
                      {entry.mnemonic}
                    </span>
                    <div className="flex-1 h-2 overflow-hidden rounded-pill bg-surface-2">
                      <div
                        className="h-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={max}
                        aria-valuenow={entry.count}
                        aria-label={`${entry.mnemonic}: ${entry.count}`}
                      />
                    </div>
                    <span
                      className="w-10 flex-none text-right font-mono text-[11px] tabular-nums text-ink-2"
                      style={{ letterSpacing: '0.04em' }}
                    >
                      {entry.count}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer
          className="flex flex-none items-center justify-between border-t border-divider px-4 py-1 font-mono text-[10px] text-ink-3"
          style={{ letterSpacing: '0.04em' }}
        >
          <span>Static counts derived from active source · Executed counter resets on Reset / re-Assemble.</span>
        </footer>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string | null }) {
  return (
    <div className="bg-surface-1 px-4 py-3">
      <div
        className="font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl tabular-nums text-ink-1">
        {value.toLocaleString()}
      </div>
      {hint && <div className="mt-0.5 text-[10px] italic text-ink-3">{hint}</div>}
    </div>
  )
}
