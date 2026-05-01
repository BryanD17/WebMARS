import { useSimulator } from '@/hooks/useSimulator.ts'
import type { SimStatus } from '@/hooks/types.ts'
import { Button } from './Button.tsx'
import { StatusPill, type SimDisplayStatus } from './StatusPill.tsx'

function pillFor(status: SimStatus): SimDisplayStatus {
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

  const canAssemble = source.length > 0 && status !== 'running'
  const canRun      = status === 'ready' || status === 'paused'
  const canStep     = status === 'ready' || status === 'paused'
  const canReset    = status !== 'idle'

  return (
    <header className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-divider bg-surface-1 px-4">
      <span className="font-display text-base font-medium tracking-tight text-ink-1">
        WebMARS
      </span>

      <nav
        aria-label="Simulator controls"
        className="flex items-center justify-center gap-2"
      >
        <Button
          variant="ghost"
          disabled={!canAssemble}
          aria-disabled={!canAssemble}
          onClick={assemble}
        >
          Assemble
        </Button>
        <Button
          variant="primary"
          disabled={!canRun}
          aria-disabled={!canRun}
          onClick={run}
        >
          Run
        </Button>
        <Button
          variant="ghost"
          disabled={!canStep}
          aria-disabled={!canStep}
          onClick={step}
        >
          Step
        </Button>
        <Button
          variant="ghost"
          disabled={!canReset}
          aria-disabled={!canReset}
          onClick={reset}
        >
          Reset
        </Button>
      </nav>

      <StatusPill status={pillFor(status)} />
    </header>
  )
}
