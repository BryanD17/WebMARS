import { useEffect, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'

function formatPc(pc: number): string {
  return '0x' + (pc >>> 0).toString(16).padStart(8, '0')
}

const tracked08 = { letterSpacing: '0.08em' } as const

function ToggleButton({
  isExpanded,
  onClick,
}: {
  isExpanded: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isExpanded ? 'Collapse developer panel' : 'Expand developer panel'}
      aria-expanded={isExpanded}
      title={
        isExpanded
          ? 'Minimize dev panel (Ctrl/Cmd+Shift+D)'
          : 'Open dev panel (Ctrl/Cmd+Shift+D)'
      }
      className="size-6 cursor-pointer rounded-sm border border-divider bg-surface-elev font-mono text-[10px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {isExpanded ? '−' : '</>'}
    </button>
  )
}

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

function ExpandedPanel() {
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
      role="region"
      aria-label="Developer panel"
      className="min-w-[15rem] rounded-md border border-divider bg-surface-elev/95 px-3 py-2 shadow-lg backdrop-blur"
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

export function DevPanel() {
  // Local UI preference — does NOT belong in the Zustand store. Day 5
  // could persist this to localStorage; today it's per-tab session
  // state.
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey
      if (mod && event.shiftKey && event.code === 'KeyD') {
        event.preventDefault()
        setIsExpanded((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col items-end gap-1">
      {isExpanded && <ExpandedPanel />}
      <ToggleButton
        isExpanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
      />
    </div>
  )
}
