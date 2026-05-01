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
  const source = useSimulator((s) => s.source)

  const trackedUppercase = { letterSpacing: '0.06em' } as const

  const charCount = source.length
  const lineCount = source === '' ? 0 : source.split('\n').length

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

      {/* Center: live source line + char count. Day 3 replaces this
         with cycle count + PC. */}
      <span
        className="flex items-center gap-1 border-r border-divider px-4"
        style={trackedUppercase}
      >
        <span className="tabular-nums text-ink-2">{charCount}</span>
        <span className="text-ink-3">chars ·</span>
        <span className="tabular-nums text-ink-2">{lineCount}</span>
        <span className="text-ink-3">lines</span>
      </span>

      {/* Right: build version + active inspector tab. Right padding
         is 24px (vs 16px elsewhere) so the trailing label clears the
         inspector's 8px scrollbar gutter when the register table
         overflows. */}
      <span className="flex items-center gap-2 pl-4 pr-6">
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
