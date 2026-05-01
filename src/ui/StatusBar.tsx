import { useSimulator } from '@/hooks/useSimulator.ts'

const APP_VERSION = 'v0.1.0-dev'

const STATUS_LABEL: Record<string, string> = {
  idle:       'Ready',
  assembling: 'Assembling…',
  ready:      'Assembled — press Run or Step',
  running:    'Running…',
  paused:     'Paused',
  halted:     'Halted',
  error:      'Error',
}

export function StatusBar() {
  const status   = useSimulator((s) => s.status)
  const regs     = useSimulator((s) => s.registers)
  const rtErr    = useSimulator((s) => s.runtimeError)
  const asmErrs  = useSimulator((s) => s.assemblerErrors)

  const isError  = status === 'error'
  const label    = STATUS_LABEL[status] ?? status

  const detail = isError
    ? (rtErr?.message ?? asmErrs[0]?.message ?? '')
    : (status === 'paused' || status === 'halted')
      ? `PC ${('0x' + regs.pc.toString(16).padStart(8, '0').toUpperCase())}`
      : ''

  return (
    <footer className="flex h-7 items-center justify-between border-t border-divider bg-surface-1 px-4 text-xs text-ink-2">
      <span className={isError ? 'text-danger' : ''}>
        {label}
        {detail && <span className="ml-2 text-ink-3">{detail}</span>}
      </span>
      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-ink-3">
        {APP_VERSION}
      </span>
    </footer>
  )
}
