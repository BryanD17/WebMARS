import { useSimulator, type LeftPanelKey } from '@/hooks/useSimulator.ts'
import { BreakpointsPanel } from './BreakpointsPanel.tsx'
import { SymbolsPanel } from './SymbolsPanel.tsx'
import { ReferencePanel } from './ReferencePanel.tsx'
import { ProjectPanel } from './ProjectPanel.tsx'
import { ToolsPanel } from './ToolsPanel.tsx'
import { cn } from './cn.ts'

interface RailIcon {
  id: LeftPanelKey
  label: string
  glyph: string                    // unicode glyph until SA-15 brings real icons
  futureSubAgent?: string          // unset means the icon is wired
}

const RAIL_ICONS: ReadonlyArray<RailIcon> = [
  { id: 'project',     label: 'Project',          glyph: '◧' },
  { id: 'symbols',     label: 'Symbols',          glyph: '⌗' },
  { id: 'breakpoints', label: 'Breakpoints',      glyph: '●' },
  { id: 'reference',   label: 'Reference',        glyph: '?' },
  { id: 'tools',       label: 'Tools',            glyph: '⚙' },
]

// Reads leftRailExpanded + leftPanelKey from the layout slice.
// Collapsed = 48px icon rail; expanded = 240px (icon column + the
// active panel rendered to its right). Clicking a wired icon sets
// leftPanelKey AND expands the rail; subsequent clicks on the same
// icon collapse. The bottom anchor holds a settings cog (Phase 3
// SA-7) and the rail collapse toggle.
export function LeftRail() {
  const expanded     = useSimulator((s) => s.leftRailExpanded)
  const panelKey     = useSimulator((s) => s.leftPanelKey)
  const toggleExpand = useSimulator((s) => s.toggleLeftRail)
  const setPanel     = useSimulator((s) => s.setLeftPanel)
  const openSettings = useSimulator((s) => s.openSettings)

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

        {/* Phase 3 SA-7: Settings cog at the bottom of the rail
           opens the Settings dialog. Same behaviour as Settings →
           Open Settings… in the menu bar. */}
        <button
          type="button"
          onClick={openSettings}
          aria-label="Open settings"
          title="Settings (Ctrl+,)"
          className="flex size-8 items-center justify-center rounded-sm font-mono text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          ⚙
        </button>

        <button
          type="button"
          onClick={toggleExpand}
          aria-label={expanded ? 'Collapse left rail' : 'Expand left rail'}
          title={expanded ? 'Collapse left rail (Ctrl+B)' : 'Expand left rail (Ctrl+B)'}
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
          ) : panelKey === 'symbols' ? (
            <SymbolsPanel />
          ) : panelKey === 'reference' ? (
            <ReferencePanel />
          ) : panelKey === 'project' ? (
            <ProjectPanel />
          ) : panelKey === 'tools' ? (
            <ToolsPanel />
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
