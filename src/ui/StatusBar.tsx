import { useSimulator } from '@/hooks/useSimulator.ts'
import type { SimStatus } from '@/hooks/types.ts'

const APP_VERSION = 'v0.1.0-dev'

function statusLabel(status: SimStatus): string {
  switch (status) {
    case 'idle':       return 'Idle'
    case 'assembling': return 'Assembling'
    case 'ready':      return 'Ready'
    case 'running':    return 'Running'
    case 'paused':     return 'Paused'
    case 'halted':     return 'Halted'
    case 'error':      return 'Error'
  }
}

export function StatusBar() {
  const status = useSimulator((s) => s.status)
  const inspectorTab = useSimulator((s) => s.inspectorTab)

  const trackedUppercase = { letterSpacing: '0.06em' } as const

  return (
    <footer
      className="grid h-8 grid-cols-[auto_1fr_auto] items-center border-t border-divider bg-surface-1 font-mono text-xs uppercase"
    >
      {/* Left: current sim status */}
      <span
        className="border-r border-divider px-4 text-ink-2"
        style={trackedUppercase}
      >
        {statusLabel(status)}
      </span>

      {/* Center: reserved for cycle count + PC on Day 3 */}
      <span aria-hidden="true" className="border-r border-divider" />

      {/* Right: build version + active inspector tab */}
      <span className="flex items-center gap-2 px-4">
        <span className="text-ink-3" style={trackedUppercase}>
          {APP_VERSION}
        </span>
        <span aria-hidden="true" className="text-ink-3">
          ·
        </span>
        <span className="text-ink-2" style={trackedUppercase}>
          {inspectorTab}
        </span>
      </span>
    </footer>
  )
}
