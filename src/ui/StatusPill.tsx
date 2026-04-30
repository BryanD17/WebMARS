import { cn } from './cn.ts'

export type SimDisplayStatus = 'idle' | 'running' | 'paused'

const VARIANTS: Record<SimDisplayStatus, { label: string; classes: string }> = {
  idle:    { label: 'Idle',    classes: 'bg-surface-3 text-ink-2' },
  running: { label: 'Running', classes: 'bg-accent text-surface-0' },
  paused:  { label: 'Paused',  classes: 'bg-warn text-surface-0' },
}

export function StatusPill({ status }: { status: SimDisplayStatus }) {
  const variant = VARIANTS[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        variant.classes,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current opacity-80"
      />
      {variant.label}
    </span>
  )
}
