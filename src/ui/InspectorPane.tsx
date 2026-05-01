import { useRef, type KeyboardEvent } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import type { InspectorTab } from '@/hooks/types.ts'
import { cn } from './cn.ts'

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: ReadonlyArray<{ id: InspectorTab; label: string }> = [
  { id: 'registers', label: 'Registers' },
  { id: 'memory',    label: 'Memory' },
  { id: 'console',   label: 'Console' },
]

// ─── GPR display order ────────────────────────────────────────────────────────

const GPR_NAMES = [
  '$zero','$at','$v0','$v1','$a0','$a1','$a2','$a3',
  '$t0','$t1','$t2','$t3','$t4','$t5','$t6','$t7',
  '$s0','$s1','$s2','$s3','$s4','$s5','$s6','$s7',
  '$t8','$t9','$k0','$k1','$gp','$sp','$fp','$ra',
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hex8(n: number) {
  return '0x' + (n >>> 0).toString(16).padStart(8, '0').toUpperCase()
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function RegistersPanel() {
  const regs    = useSimulator((s) => s.registers)
  const status  = useSimulator((s) => s.status)
  const isEmpty = status === 'idle'

  if (isEmpty) {
    return <EmptyState>Assemble a program to inspect registers.</EmptyState>
  }

  return (
    <div className="font-mono text-xs">
      {/* Special registers */}
      <table className="mb-3 w-full">
        <tbody>
          {(['pc', 'hi', 'lo'] as const).map((name) => {
            const val = name === 'pc' ? regs.pc : name === 'hi' ? regs.hi : regs.lo
            const hot = regs.changed.has(name)
            return (
              <tr
                key={name}
                className={cn(
                  'transition-colors',
                  hot && 'bg-accent/15',
                )}
              >
                <td className="w-12 py-0.5 pr-3 text-right text-ink-3 uppercase">{name}</td>
                <td className="pr-4 text-accent">{hex8(val)}</td>
                <td className="text-ink-2">{val | 0}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mb-1 border-t border-divider" />

      {/* GPR table — two columns */}
      <div className="grid grid-cols-2 gap-x-4">
        {GPR_NAMES.map((name) => {
          const val = regs.gpr[name] ?? 0
          const hot = regs.changed.has(name)
          return (
            <div
              key={name}
              className={cn(
                'flex items-baseline gap-2 rounded py-0.5 px-1 transition-colors',
                hot && 'bg-accent/15',
              )}
            >
              <span className="w-10 shrink-0 text-right text-ink-3">{name}</span>
              <span className={cn('text-ink-1', hot && 'text-accent')}>{hex8(val)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MemoryPanel() {
  const memoryMap = useSimulator((s) => s.memoryMap)
  const status    = useSimulator((s) => s.status)

  if (status === 'idle') {
    return <EmptyState>Assemble a program to inspect memory.</EmptyState>
  }

  const entries = [...memoryMap.entries()]
    .sort(([a], [b]) => a - b)
    .slice(0, 512) // cap at 512 words to keep UI fast

  if (entries.length === 0) {
    return <EmptyState>No data in memory yet.</EmptyState>
  }

  return (
    <table className="w-full font-mono text-xs">
      <thead>
        <tr className="text-left text-ink-3">
          <th className="pb-1 pr-4 font-medium">Address</th>
          <th className="pb-1 pr-4 font-medium">Hex</th>
          <th className="pb-1 font-medium">Decimal</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([addr, val]) => (
          <tr key={addr} className="border-t border-divider/40">
            <td className="py-0.5 pr-4 text-ink-3">{hex8(addr)}</td>
            <td className="pr-4 text-ink-1">{hex8(val)}</td>
            <td className="text-ink-2">{val | 0}</td>
          </tr>
        ))}
        {memoryMap.size > 512 && (
          <tr>
            <td colSpan={3} className="pt-2 text-center text-ink-3 italic">
              … {memoryMap.size - 512} more words not shown
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function ConsolePanel() {
  const lines  = useSimulator((s) => s.consoleOutput)
  const errors = useSimulator((s) => s.assemblerErrors)
  const rtErr  = useSimulator((s) => s.runtimeError)
  const output = lines.join('')

  return (
    <div className="flex flex-col gap-3">
      {/* Assembler errors */}
      {errors.length > 0 && (
        <div className="rounded-md bg-danger/10 p-3">
          <p className="mb-1 text-xs font-semibold text-danger">Assembler errors</p>
          {errors.map((e, i) => (
            <p key={i} className="font-mono text-xs text-danger">
              Line {e.line}: {e.message}
            </p>
          ))}
        </div>
      )}

      {/* Runtime error */}
      {rtErr && (
        <div className="rounded-md bg-danger/10 p-3">
          <p className="mb-1 text-xs font-semibold text-danger">Runtime error</p>
          <p className="font-mono text-xs text-danger">
            PC {hex8(rtErr.pc)}: {rtErr.message}
          </p>
        </div>
      )}

      {/* Program output */}
      <div className="rounded-md bg-surface-0 p-3">
        <p className="mb-1 text-xs font-semibold text-ink-3">Output</p>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-ink-1">
          {output || <span className="italic text-ink-3">No output yet.</span>}
        </pre>
      </div>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm italic text-ink-3">{children}</p>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InspectorPane() {
  const active    = useSimulator((s) => s.inspectorTab)
  const setActive = useSimulator((s) => s.setInspectorTab)
  const tabRefs   = useRef<Map<InspectorTab, HTMLButtonElement>>(new Map())

  function focusTab(id: InspectorTab) {
    setActive(id)
    tabRefs.current.get(id)?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const idx = TABS.findIndex((t) => t.id === active)
    if (idx === -1) return
    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault()
        const next = TABS[(idx + 1) % TABS.length]
        if (next) focusTab(next.id)
        return
      }
      case 'ArrowLeft': {
        event.preventDefault()
        const prev = TABS[(idx - 1 + TABS.length) % TABS.length]
        if (prev) focusTab(prev.id)
        return
      }
      case 'Home': {
        event.preventDefault()
        const first = TABS[0]
        if (first) focusTab(first.id)
        return
      }
      case 'End': {
        event.preventDefault()
        const last = TABS[TABS.length - 1]
        if (last) focusTab(last.id)
        return
      }
    }
  }

  return (
    <aside
      aria-label="Inspector"
      className="flex min-h-0 min-w-0 flex-col border-t border-divider bg-surface-1 lg:border-t-0"
    >
      <div
        role="tablist"
        aria-label="Inspector views"
        onKeyDown={handleKeyDown}
        className="flex border-b border-divider"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) tabRefs.current.set(tab.id, node)
                else tabRefs.current.delete(tab.id)
              }}
              role="tab"
              type="button"
              id={`inspector-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`inspector-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                'flex-1 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                selected
                  ? 'border-accent bg-surface-2 text-ink-1'
                  : 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink-1',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`inspector-panel-${tab.id}`}
          aria-labelledby={`inspector-tab-${tab.id}`}
          hidden={tab.id !== active}
          className="flex-1 overflow-auto p-4"
        >
          {tab.id === 'registers' && <RegistersPanel />}
          {tab.id === 'memory'    && <MemoryPanel />}
          {tab.id === 'console'   && <ConsolePanel />}
        </div>
      ))}
    </aside>
  )
}
