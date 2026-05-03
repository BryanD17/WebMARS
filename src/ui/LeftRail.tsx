import { useSimulator, type LeftPanelKey } from '@/hooks/useSimulator.ts'
import { BreakpointsPanel } from './BreakpointsPanel.tsx'
import { cn } from './cn.ts'

interface RailIcon {
  id: LeftPanelKey
  label: string
  glyph: string                    // unicode glyph until SA-15 brings real icons
  futureSubAgent?: string          // unset means the icon is wired
}

const RAIL_ICONS: ReadonlyArray<RailIcon> = [
  { id: 'project',     label: 'Project',          glyph: '◧', futureSubAgent: 'SA-2 (file system)' },
  { id: 'symbols',     label: 'Symbols',          glyph: '⌗', futureSubAgent: 'SA-11' },
  { id: 'breakpoints', label: 'Breakpoints',      glyph: '●' },
  { id: 'reference',   label: 'Reference',        glyph: '?', futureSubAgent: 'SA-11' },
  { id: 'tools',       label: 'Tools',            glyph: '⚙', futureSubAgent: 'SA-15' },
]

// Reads leftRailExpanded + leftPanelKey from the layout slice.
// Collapsed = 48px icon rail; expanded = 240px (icon column + the
// active panel rendered to its right). Clicking a wired icon
// (currently only Breakpoints from SA-9) sets leftPanelKey AND
// expands the rail; subsequent clicks on the same icon collapse.
export function LeftRail() {
  const expanded     = useSimulator((s) => s.leftRailExpanded)
  const panelKey     = useSimulator((s) => s.leftPanelKey)
  const toggleExpand = useSimulator((s) => s.toggleLeftRail)
  const setPanel     = useSimulator((s) => s.setLeftPanel)

  function handleIconClick(icon: RailIcon): void {
    if (icon.futureSubAgent !== undefined) return
    if (expanded && panelKey === icon.id) {
      toggleExpand()
      return
    }
    setPanel(icon.id)
    if (!expanded) toggleExpand()
  }

  return (
    <aside
      aria-label="Left rail"
      className={cn(
        'flex flex-none border-r border-divider bg-surface-1',
        expanded ? 'w-60' : 'w-12',
      )}
    >
      <div className="flex w-12 flex-none flex-col items-center gap-1 py-2">
        {RAIL_ICONS.map((icon) => {
          const active = expanded && panelKey === icon.id && icon.futureSubAgent === undefined
          const wired  = icon.futureSubAgent === undefined
          return (
            <button
              key={icon.id}
              type="button"
              disabled={!wired}
              onClick={wired ? () => handleIconClick(icon) : undefined}
              title={wired
                ? `${icon.label}`
                : `${icon.label} — wired in ${icon.futureSubAgent}`}
              aria-label={wired
                ? icon.label
                : `${icon.label} (disabled until ${icon.futureSubAgent})`}
              aria-pressed={active}
              className={cn(
                'flex size-8 items-center justify-center rounded-sm font-mono text-base transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                !wired && 'cursor-not-allowed text-ink-3 hover:bg-surface-2 hover:text-ink-2',
                wired && active && 'bg-surface-3 text-ink-1',
                wired && !active && 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
              )}
            >
              {icon.glyph}
            </button>
          )
        })}

        <span className="flex-1" aria-hidden="true" />

        <button
          type="button"
          onClick={toggleExpand}
          aria-label={expanded ? 'Collapse left rail' : 'Expand left rail'}
          title={expanded ? 'Collapse left rail (Ctrl+B — wired in SA-14)' : 'Expand left rail (Ctrl+B — wired in SA-14)'}
          className="flex size-8 items-center justify-center rounded-sm font-mono text-xs text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          {expanded ? '◀' : '▶'}
        </button>
      </div>

      {expanded && (
        <div
          className="flex-1 overflow-hidden border-l border-divider bg-surface-1"
          aria-live="polite"
        >
          {panelKey === 'breakpoints' ? (
            <BreakpointsPanel />
          ) : (
            <div className="px-3 py-3 text-xs italic text-ink-3">
              ({panelKey} panel lands in a later sub-agent)
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
