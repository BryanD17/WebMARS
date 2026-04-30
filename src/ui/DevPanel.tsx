import { useSimulator } from '@/hooks/useSimulator.ts'

function formatPc(pc: number): string {
  return '0x' + pc.toString(16).padStart(8, '0')
}

export function DevPanel() {
  const status = useSimulator((s) => s.status)
  const sourceLength = useSimulator((s) => s.source.length)
  const pc = useSimulator((s) => s.registers.pc)

  return (
    <div
      aria-label="Developer panel"
      className="fixed bottom-3 right-3 z-50 min-w-[14rem] rounded-md border border-divider bg-surface-2/95 px-3 py-2 font-mono text-xs text-ink-2 shadow-lg backdrop-blur"
    >
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-ink-3">
        dev panel
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-ink-3">status</dt>
        <dd className="text-ink-1">{status}</dd>
        <dt className="text-ink-3">source.length</dt>
        <dd className="text-ink-1">{sourceLength}</dd>
        <dt className="text-ink-3">pc</dt>
        <dd className="text-ink-1">{formatPc(pc)}</dd>
      </dl>
    </div>
  )
}
