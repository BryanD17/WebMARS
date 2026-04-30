import { Button } from './Button.tsx'
import { StatusPill } from './StatusPill.tsx'

const ACTIONS = [
  { id: 'assemble', label: 'Assemble' },
  { id: 'run',      label: 'Run' },
  { id: 'step',     label: 'Step' },
  { id: 'reset',    label: 'Reset' },
] as const

export function ControlBar() {
  return (
    <header
      className="grid h-14 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-divider bg-surface-1 px-4"
    >
      <span className="font-display text-base font-medium tracking-tight text-ink-1">
        WebMARS
      </span>

      <nav
        aria-label="Simulator controls"
        className="flex items-center justify-center gap-2"
      >
        {ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            disabled
            aria-disabled="true"
          >
            {action.label}
          </Button>
        ))}
      </nav>

      <StatusPill status="idle" />
    </header>
  )
}
