import { useEffect, useMemo, useRef } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from '../cn.ts'

// Phase 3 SA-15: memory-reference visualization. Reads
// memoryRefCounts from the store (populated by the engine's
// read/write hooks via store.recordMemoryRef) and renders a
// horizontal bar chart of the top 50 addresses.
//
// MVP scope: count-based bars per address. A future iteration could
// split read vs write, color by recency, or render a heatmap over
// the full address space.

const TOP_N = 50

export function MemoryRefViz() {
  const open      = useSimulator((s) => s.toolsDialog === 'memRef')
  const closeTool = useSimulator((s) => s.closeTool)
  const counts    = useSimulator((s) => s.memoryRefCounts)
  const clearRefs = useSimulator((s) => s.clearMemoryRefs)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) { if (event.key === 'Escape') closeTool() }
    window.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, closeTool])

  const top = useMemo(() => {
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N)
    const max = entries[0]?.[1] ?? 1
    return { entries, max }
  }, [counts])

  if (!open) return null

  const total = [...counts.values()].reduce((a, b) => a + b, 0)

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeTool() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Memory Reference Visualization"
        tabIndex={-1}
        className={cn(
          'flex h-[36rem] w-[40rem] flex-col overflow-hidden rounded-lg border border-divider bg-surface-1 shadow-xl',
          'focus-visible:outline-none',
        )}
      >
        <header className="flex h-10 flex-none items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-2 text-sm text-ink-1">
            <span aria-hidden="true">📊</span>
            Memory Reference Visualization
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearRefs}
              disabled={counts.size === 0}
              className={cn(
                'rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase transition-colors',
                counts.size === 0
                  ? 'cursor-not-allowed text-ink-3'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
              )}
              style={{ letterSpacing: '0.06em' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={closeTool}
              aria-label="Close"
              title="Close (Esc)"
              className="rounded-sm px-2 py-0.5 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              ×
            </button>
          </div>
        </header>

        <div className="grid flex-none grid-cols-3 gap-px border-b border-divider bg-divider text-center">
          <div className="bg-surface-1 px-3 py-2"><div className="font-mono text-[10px] uppercase text-ink-3">Unique addresses</div><div className="mt-0.5 font-mono text-lg text-ink-1">{counts.size}</div></div>
          <div className="bg-surface-1 px-3 py-2"><div className="font-mono text-[10px] uppercase text-ink-3">Total references</div><div className="mt-0.5 font-mono text-lg text-ink-1">{total}</div></div>
          <div className="bg-surface-1 px-3 py-2"><div className="font-mono text-[10px] uppercase text-ink-3">Top address hits</div><div className="mt-0.5 font-mono text-lg text-ink-1">{top.max}</div></div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {counts.size === 0 ? (
            <div className="px-3 py-3 text-xs italic text-ink-3">
              No memory references recorded yet. Open this tool BEFORE running a program — references are tracked from the moment the tool subscribes.
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {top.entries.map(([addr, n]) => {
                const pct = (n / top.max) * 100
                return (
                  <li key={addr} className="flex items-center gap-3 text-[11px]">
                    <span className="w-24 flex-none font-mono tabular-nums text-ink-2">
                      0x{(addr >>> 0).toString(16).padStart(8, '0')}
                    </span>
                    <div className="flex-1 h-2 overflow-hidden rounded-pill bg-surface-2">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 flex-none text-right font-mono tabular-nums text-ink-2">{n}</span>
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
          <span>Aggregated at word granularity. Top {TOP_N} shown.</span>
        </footer>
      </div>
    </div>
  )
}
