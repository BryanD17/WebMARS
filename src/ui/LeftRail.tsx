import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

interface RailIcon {
  id: string
  label: string
  glyph: string         // unicode glyph until SA-15 brings real icons
  futureSubAgent: string
}

const RAIL_ICONS: ReadonlyArray<RailIcon> = [
  { id: 'project',     label: 'Project',          glyph: '◧', futureSubAgent: 'SA-2 (file system)' },
  { id: 'symbols',     label: 'Symbols',          glyph: '⌗', futureSubAgent: 'SA-11' },
  { id: 'breakpoints', label: 'Breakpoints',      glyph: '●', futureSubAgent: 'SA-9' },
  { id: 'reference',   label: 'Reference',        glyph: '?', futureSubAgent: 'SA-11' },
  { id: 'tools',       label: 'Tools',            glyph: '⚙', futureSubAgent: 'SA-15' },
]

// Reads leftRailExpanded from the layout slice. Collapsed = 48px icon
// rail; expanded = 240px (icon column + an empty side panel ready to
// host SA-9 / SA-11 / SA-15 panels). The expand/collapse toggle lives
// at the bottom of the icon column.
export function LeftRail() {
  const expanded     = useSimulator((s) => s.leftRailExpanded)
  const toggleExpand = useSimulator((s) => s.toggleLeftRail)

  return (
    <aside
      aria-label="Left rail"
      className={cn(
        'flex flex-none border-r border-divider bg-surface-1',
        expanded ? 'w-60' : 'w-12',
      )}
    >
      <div className="flex w-12 flex-none flex-col items-center gap-1 py-2">
        {RAIL_ICONS.map((icon) => (
          <button
            key={icon.id}
            type="button"
            disabled
            title={`${icon.label} — wired in ${icon.futureSubAgent}`}
            aria-label={`${icon.label} (disabled until ${icon.futureSubAgent})`}
            className={cn(
              'flex size-8 items-center justify-center rounded-sm font-mono text-base',
              'cursor-not-allowed text-ink-3',
              'hover:bg-surface-2 hover:text-ink-2',
            )}
          >
            {icon.glyph}
          </button>
        ))}

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
          className="flex-1 overflow-y-auto border-l border-divider bg-surface-1 px-3 py-3 text-xs italic text-ink-3"
          aria-live="polite"
        >
          <div>(panel content lands in SA-9 / SA-11 / SA-15)</div>
        </div>
      )}
    </aside>
  )
}
