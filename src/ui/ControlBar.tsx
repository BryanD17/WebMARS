import { useSimulator } from '@/hooks/useSimulator.ts'
import { Button } from './Button.tsx'
import { StatusPill } from './StatusPill.tsx'

export function ControlBar() {
  const source   = useSimulator((s) => s.source)
  const assemble = useSimulator((s) => s.assemble)
  const run      = useSimulator((s) => s.run)
  const step     = useSimulator((s) => s.step)
  const reset    = useSimulator((s) => s.reset)

  // Buttons stay disabled until there's source to act on. Once typed,
  // the click path is real — each button calls into the store.
  const noSource = source.length === 0

  return (
    <header className="grid h-14 grid-cols-[auto_1fr_auto] items-center border-b border-divider bg-surface-1">
      {/* Left: brand */}
      <div className="flex h-full w-20 items-center gap-2 border-r border-divider px-4">
        <span aria-hidden="true" className="size-2 bg-accent" />
        <span className="font-display text-base font-medium tracking-tight text-ink-1">
          WebMARS
        </span>
      </div>

      {/* Center: action buttons */}
      <nav
        aria-label="Simulator controls"
        className="flex items-center justify-center gap-0"
      >
        <Button
          variant="primary"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={assemble}
          className="rounded-r-none"
        >
          Assemble
        </Button>
        <Button
          variant="ghost"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={run}
          className="rounded-none border-r border-divider"
        >
          Run
        </Button>
        <Button
          variant="ghost"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={step}
          className="rounded-l-none"
        >
          Step
        </Button>
        <Button
          variant="ghost"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={reset}
          className="ml-3"
        >
          Reset
        </Button>
      </nav>

      {/* Right: status pill */}
      <div className="px-4">
        <StatusPill />
      </div>
    </header>
  )
}
