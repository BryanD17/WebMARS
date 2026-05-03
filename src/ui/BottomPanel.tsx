import { useSimulator, type BottomPanelTab } from '@/hooks/useSimulator.ts'
import { ConsoleEmpty } from './ConsoleEmpty.tsx'
import { cn } from './cn.ts'

const TABS: ReadonlyArray<{ id: BottomPanelTab; label: string }> = [
  { id: 'console',  label: 'Console'  },
  { id: 'messages', label: 'Messages' },
  { id: 'problems', label: 'Problems' },
]

function PlaceholderBody({ description, futureSubAgent }: { description: string; futureSubAgent: string }) {
  return (
    <div className="text-xs italic text-ink-3">
      {description}
      <span
        className="ml-2 font-mono text-[10px]"
        style={{ letterSpacing: '0.04em' }}
      >
        wired in {futureSubAgent}
      </span>
    </div>
  )
}

// Bottom panel reads its open/closed state and active tab from the
// layout slice (persisted to webmars:layout). When closed, the body
// disappears and only the 28px tab strip remains, with a chevron
// expand affordance on the right. Clicking any tab while closed
// re-opens the panel and selects that tab.
export function BottomPanel() {
  const open       = useSimulator((s) => s.bottomPanelOpen)
  const activeTab  = useSimulator((s) => s.bottomPanelTab)
  const setTab     = useSimulator((s) => s.setBottomTab)
  const toggleOpen = useSimulator((s) => s.toggleBottomPanel)

  return (
    <footer
      aria-label="Bottom panel"
      className={cn(
        'flex min-h-0 flex-col border-t border-divider bg-surface-1',
        open ? 'h-[200px]' : 'h-7',
      )}
    >
      <div role="tablist" aria-label="Bottom panel tabs" className="flex h-7 flex-none items-stretch border-b border-divider">
        {TABS.map((tab) => {
          const selected = open && tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                if (!open) toggleOpen()
                setTab(tab.id)
              }}
              className={cn(
                'border-b-2 px-3 font-mono text-xs uppercase transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                selected
                  ? 'border-accent bg-surface-2 text-ink-1'
                  : 'border-transparent text-ink-3 hover:text-ink-2',
              )}
              style={{ letterSpacing: '0.06em' }}
            >
              {tab.label}
            </button>
          )
        })}

        <span className="flex-1" aria-hidden="true" />

        <button
          type="button"
          onClick={toggleOpen}
          aria-label={open ? 'Collapse bottom panel' : 'Expand bottom panel'}
          title={open ? 'Collapse bottom panel (Ctrl+J — wired in SA-14)' : 'Expand bottom panel (Ctrl+J — wired in SA-14)'}
          className="px-3 font-mono text-xs text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          {open ? '▾' : '▴'}
        </button>
      </div>

      {open && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {activeTab === 'console' && <ConsoleEmpty />}
          {activeTab === 'messages' && (
            <PlaceholderBody
              description="Run-state transitions, assemble events, and notable runtime messages will land here."
              futureSubAgent="SA-6"
            />
          )}
          {activeTab === 'problems' && (
            <PlaceholderBody
              description="Aggregated assembler and runtime errors will appear here, click-to-jump to the offending line."
              futureSubAgent="SA-6"
            />
          )}
        </div>
      )}
    </footer>
  )
}
