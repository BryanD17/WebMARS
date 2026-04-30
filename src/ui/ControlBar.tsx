import { useSimulator } from '@/hooks/useSimulator.ts'
import type { SimStatus } from '@/hooks/types.ts'
import { Button } from './Button.tsx'
import { StatusPill, type SimDisplayStatus } from './StatusPill.tsx'

function pillStatusFor(status: SimStatus): SimDisplayStatus {
  if (status === 'running') return 'running'
  if (status === 'paused')  return 'paused'
  return 'idle'
}

export function ControlBar() {
  const source   = useSimulator((s) => s.source)
  const status   = useSimulator((s) => s.status)
  const assemble = useSimulator((s) => s.assemble)
  const run      = useSimulator((s) => s.run)
  const step     = useSimulator((s) => s.step)
  const reset    = useSimulator((s) => s.reset)

  // Buttons stay disabled until there's source to act on. Once typed,
  // the click path is real — each button calls into the store.
  const noSource = source.length === 0

  return (
    <header className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-divider bg-surface-1 px-4">
      <span className="font-display text-base font-medium tracking-tight text-ink-1">
        WebMARS
      </span>

      <nav
        aria-label="Simulator controls"
        className="flex items-center justify-center gap-2"
      >
        <Button variant="ghost" disabled={noSource} aria-disabled={noSource} onClick={assemble}>
          Assemble
        </Button>
        <Button variant="primary" disabled={noSource} aria-disabled={noSource} onClick={run}>
          Run
        </Button>
        <Button variant="ghost" disabled={noSource} aria-disabled={noSource} onClick={step}>
          Step
        </Button>
        <Button variant="ghost" disabled={noSource} aria-disabled={noSource} onClick={reset}>
          Reset
        </Button>
      </nav>

      <StatusPill status={pillStatusFor(status)} />
    </header>
  )
}
