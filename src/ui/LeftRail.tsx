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

// Collapsed (48px) icon rail. SA-9 / SA-11 / SA-15 wire each icon to
// its expanded panel; SA-1 commit 5 adds the leftRailExpanded toggle
// from the layout slice. For now every icon is a disabled placeholder
// with a tooltip naming the sub-agent that wires it.
export function LeftRail() {
  return (
    <aside
      aria-label="Left rail"
      className="flex w-12 flex-none flex-col items-center gap-1 border-r border-divider bg-surface-1 py-2"
    >
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
    </aside>
  )
}
