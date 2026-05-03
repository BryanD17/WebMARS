import { useState } from 'react'
import { cn } from './cn.ts'
import { ConsoleEmpty } from './ConsoleEmpty.tsx'

const TABS = ['Console', 'Messages', 'Problems'] as const
type BottomTab = (typeof TABS)[number]

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

// Placeholder bottom panel with a 28px tab strip and a 200px body.
// SA-1 commit 5 adds the layout-slice toggle so the body height
// collapses to 0 (tab strip only, 28px) when the user toggles it
// off via View → Toggle Bottom Panel. SA-6 fills in the Messages
// and Problems tabs with real content + a filter input + auto-scroll.
export function BottomPanel() {
  const [activeTab, setActiveTab] = useState<BottomTab>('Console')

  return (
    <footer
      aria-label="Bottom panel"
      className="flex h-[200px] min-h-0 flex-col border-t border-divider bg-surface-1"
    >
      <div role="tablist" aria-label="Bottom panel tabs" className="flex h-7 border-b border-divider">
        {TABS.map((tab) => {
          const selected = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'border-b-2 px-3 font-mono text-xs uppercase transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                selected
                  ? 'border-accent bg-surface-2 text-ink-1'
                  : 'border-transparent text-ink-3 hover:text-ink-2',
              )}
              style={{ letterSpacing: '0.06em' }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {activeTab === 'Console' && <ConsoleEmpty />}
        {activeTab === 'Messages' && (
          <PlaceholderBody
            description="Run-state transitions, assemble events, and notable runtime messages will land here."
            futureSubAgent="SA-6"
          />
        )}
        {activeTab === 'Problems' && (
          <PlaceholderBody
            description="Aggregated assembler and runtime errors will appear here, click-to-jump to the offending line."
            futureSubAgent="SA-6"
          />
        )}
      </div>
    </footer>
  )
}
