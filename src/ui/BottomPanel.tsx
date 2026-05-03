import { useSimulator, type BottomPanelTab } from '@/hooks/useSimulator.ts'
import { ConsolePanel } from './ConsolePanel.tsx'
import { MessagesPanel } from './MessagesPanel.tsx'
import { ProblemsPanel } from './ProblemsPanel.tsx'
import { cn } from './cn.ts'

const TABS: ReadonlyArray<{ id: BottomPanelTab; label: string }> = [
  { id: 'console',  label: 'Console'  },
  { id: 'messages', label: 'Messages' },
  { id: 'problems', label: 'Problems' },
]

// Bottom panel reads its open/closed state and active tab from the
// layout slice. When closed, the body disappears and only the 28px
// tab strip remains. Each tab button shows a count badge when there
// is unread / actionable content.
export function BottomPanel() {
  const open       = useSimulator((s) => s.bottomPanelOpen)
  const activeTab  = useSimulator((s) => s.bottomPanelTab)
  const setTab     = useSimulator((s) => s.setBottomTab)
  const toggleOpen = useSimulator((s) => s.toggleBottomPanel)

  // Counts for the tab badges. Console doesn't get a badge (volume
  // is unbounded — the Clear button + filter are the affordance).
  const messageCount = useSimulator((s) => s.messages.length)
  const problemCount = useSimulator(
    (s) => s.assemblerErrors.length + (s.runtimeError ? 1 : 0),
  )

  function badgeFor(tabId: BottomPanelTab): { count: number; tone: 'error' | 'info' } | null {
    if (tabId === 'problems' && problemCount > 0) return { count: problemCount, tone: 'error' }
    if (tabId === 'messages' && messageCount > 0) return { count: messageCount, tone: 'info' }
    return null
  }

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
          const badge = badgeFor(tab.id)
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
                'flex items-center gap-2 border-b-2 px-3 font-mono text-xs uppercase transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                selected
                  ? 'border-accent bg-surface-2 text-ink-1'
                  : 'border-transparent text-ink-3 hover:text-ink-2',
              )}
              style={{ letterSpacing: '0.06em' }}
            >
              <span>{tab.label}</span>
              {badge && (
                <span
                  aria-label={`${badge.count} ${tab.id} item${badge.count === 1 ? '' : 's'}`}
                  className={cn(
                    'flex h-4 min-w-[1rem] items-center justify-center rounded-pill px-1.5 font-mono text-[10px] font-medium normal-case',
                    badge.tone === 'error'
                      ? 'bg-danger text-surface-0'
                      : 'bg-surface-3 text-ink-2',
                  )}
                  style={{ letterSpacing: '0' }}
                >
                  {badge.count}
                </span>
              )}
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
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'console'  && <ConsolePanel />}
          {activeTab === 'messages' && <MessagesPanel />}
          {activeTab === 'problems' && <ProblemsPanel />}
        </div>
      )}
    </footer>
  )
}
