import { useSimulator } from '@/hooks/useSimulator.ts'

function formatPc(pc: number): string {
  return '0x' + (pc >>> 0).toString(16).padStart(8, '0')
}

const tracked08 = { letterSpacing: '0.08em' } as const

function ActionButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm border border-divider bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] lowercase text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      {label}
    </button>
  )
}

export function DevPanel() {
  const status = useSimulator((s) => s.status)
  const sourceLength = useSimulator((s) => s.source.length)
  const pc = useSimulator((s) => s.registers.pc)
  const inspectorTab = useSimulator((s) => s.inspectorTab)
  const assemble = useSimulator((s) => s.assemble)
  const run = useSimulator((s) => s.run)
  const step = useSimulator((s) => s.step)
  const reset = useSimulator((s) => s.reset)

  return (
    <div
      aria-label="Developer panel"
      className="fixed bottom-3 right-3 z-50 min-w-[15rem] rounded-md border border-divider bg-surface-elev/95 px-3 py-2 shadow-lg backdrop-blur"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-pill bg-warn" />
        <span
          className="font-mono text-[10px] uppercase text-warn"
          style={tracked08}
        >
          DEV — only visible in development
        </span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono">
        <dt className="text-xs text-ink-3">status</dt>
        <dd className="text-right text-sm text-ink-1">{status}</dd>

        <dt className="text-xs text-ink-3">source.length</dt>
        <dd className="text-right text-sm tabular-nums text-ink-1">
          {sourceLength}
        </dd>

        <dt className="text-xs text-ink-3">pc</dt>
        <dd className="text-right text-sm tabular-nums text-ink-1">
          {formatPc(pc)}
        </dd>

        <dt className="text-xs text-ink-3">inspectorTab</dt>
        <dd className="text-right text-sm text-ink-1">{inspectorTab}</dd>
      </dl>

      <div className="mt-2 flex items-center gap-1 border-t border-divider pt-2">
        <span className="mr-auto font-mono text-[9px] lowercase text-ink-3">
          actions
        </span>
        <ActionButton label="assemble" onClick={assemble} />
        <ActionButton label="run" onClick={run} />
        <ActionButton label="step" onClick={step} />
        <ActionButton label="reset" onClick={reset} />
      </div>
    </div>
  )
}
