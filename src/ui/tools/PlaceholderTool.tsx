import { useEffect, useRef } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from '../cn.ts'

// Phase 3 SA-15: shared placeholder modal for tools deferred to
// v2.0 (Cache Simulator, MIPS X-Ray, BHT Simulator, Digital Lab,
// Scavenger Hunt, Mars Bot). Renders the tool's name + a short
// description from the bug report so the user understands what's
// coming without the menu being silent.

const DESCRIPTIONS: Record<string, string> = {
  'Data Cache Simulator':           'Configurable cache geometry (size, block size, associativity, replacement policy) with hit/miss visualization against a running program.',
  'MIPS X-Ray':                     'Animated single-cycle datapath that highlights the active wires and stages as each instruction executes.',
  'BHT Simulator':                  'Branch History Table prediction simulator. Track 1-bit and 2-bit predictor accuracy over a program run.',
  'Digital Lab Sim':                'Logic-gate sandbox tied to memory-mapped I/O for building combinational and sequential circuits.',
  'Screen Magnifier':               'Floating loupe overlay that follows the cursor at 2x zoom for projector demos.',
  'Scavenger Hunt':                 'Guided exercise generator that hides the answer in memory and asks the student to find it.',
  'Mars Bot':                       'Animated robot tied to MMIO that students program by writing MIPS instructions.',
}

export function PlaceholderTool() {
  const open      = useSimulator((s) => s.toolsDialog === 'placeholder')
  const name      = useSimulator((s) => s.toolsPlaceholderName)
  const closeTool = useSimulator((s) => s.closeTool)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) { if (event.key === 'Escape') closeTool() }
    window.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, closeTool])

  if (!open) return null

  const description = DESCRIPTIONS[name] ?? 'Coming in a future release.'

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
        aria-label={name}
        tabIndex={-1}
        className={cn(
          'flex w-[34rem] flex-col overflow-hidden rounded-lg border border-divider bg-surface-1 shadow-xl',
          'focus-visible:outline-none',
        )}
      >
        <header className="flex h-10 flex-none items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-2 text-sm text-ink-1">{name}</div>
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

        <div className="px-5 py-4">
          <div className="mb-2 inline-block rounded-pill bg-warn/20 px-2 py-0.5 font-mono text-[10px] uppercase text-warn" style={{ letterSpacing: '0.06em' }}>
            Coming in v2.0
          </div>
          <p className="text-xs text-ink-2">{description}</p>
          <p className="mt-3 text-[11px] italic text-ink-3">
            Tracked in docs/STRETCH_ROADMAP.md. Open an issue on the repo if you'd like this prioritized.
          </p>
        </div>
      </div>
    </div>
  )
}
