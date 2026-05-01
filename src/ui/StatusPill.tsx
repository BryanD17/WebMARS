import { useSimulator } from '@/hooks/useSimulator.ts'
import type { SimStatus } from '@/hooks/types.ts'
import { cn } from './cn.ts'

interface PillStyle {
  label: string
  dotClass: string
  pulse: boolean
}

const ERROR_LABEL_MAX = 40

function styleFor(status: SimStatus, errorMessage: string | undefined): PillStyle {
  switch (status) {
    case 'idle':       return { label: 'Idle',       dotClass: 'bg-ink-3',  pulse: false }
    case 'assembling': return { label: 'Assembling', dotClass: 'bg-accent', pulse: true  }
    case 'ready':      return { label: 'Ready',      dotClass: 'bg-ok',     pulse: false }
    case 'running':    return { label: 'Running',    dotClass: 'bg-accent', pulse: true  }
    case 'paused':     return { label: 'Paused',     dotClass: 'bg-warn',   pulse: false }
    case 'halted':     return { label: 'Halted',     dotClass: 'bg-ok',     pulse: false }
    case 'error': {
      const raw = errorMessage ?? 'Error'
      const label =
        raw.length > ERROR_LABEL_MAX ? raw.slice(0, ERROR_LABEL_MAX - 1) + '…' : raw
      return { label, dotClass: 'bg-danger', pulse: false }
    }
  }
}

export function StatusPill() {
  const status = useSimulator((s) => s.status)
  const firstError = useSimulator((s) => s.assemblerErrors[0])
  const style = styleFor(status, firstError?.message)
  const fullErrorTitle = status === 'error' ? firstError?.message : undefined

  return (
    <span
      role="status"
      aria-live="polite"
      title={fullErrorTitle}
      className="inline-flex items-center gap-2 rounded-md border border-divider bg-surface-elev px-3 py-1 font-mono text-xs uppercase text-ink-2"
      style={{ letterSpacing: '0.08em' }}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-pill',
          style.dotClass,
          style.pulse && 'animate-[pulse-dot_1.6s_ease-in-out_infinite]',
        )}
      />
      {style.label}
    </span>
  )
}
