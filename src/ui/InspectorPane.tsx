import { useRef, type KeyboardEvent } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import type { InspectorTab } from '@/hooks/types.ts'
import { cn } from './cn.ts'

const TABS: ReadonlyArray<{ id: InspectorTab; label: string }> = [
  { id: 'registers', label: 'Registers' },
  { id: 'memory',    label: 'Memory' },
  { id: 'console',   label: 'Console' },
]

export function InspectorPane() {
  const active = useSimulator((s) => s.inspectorTab)
  const setActive = useSimulator((s) => s.setInspectorTab)
  const tabRefs = useRef<Map<InspectorTab, HTMLButtonElement>>(new Map())

  function focusTab(id: InspectorTab) {
    setActive(id)
    tabRefs.current.get(id)?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = TABS.findIndex((t) => t.id === active)
    if (currentIndex === -1) return

    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault()
        const next = TABS[(currentIndex + 1) % TABS.length]
        if (next) focusTab(next.id)
        return
      }
      case 'ArrowLeft': {
        event.preventDefault()
        const prev = TABS[(currentIndex - 1 + TABS.length) % TABS.length]
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
          <PlaceholderCard label={tab.label} />
        </div>
      ))}
    </aside>
  )
}

function PlaceholderCard({ label }: { label: string }) {
  return (
    <div className="rounded-md bg-surface-2 p-6">
      <p className="text-sm font-medium text-ink-1">{label}</p>
      <p className="mt-2 text-sm italic text-ink-3">
        Placeholder — populated in upcoming sub-agents.
      </p>
    </div>
  )
}
