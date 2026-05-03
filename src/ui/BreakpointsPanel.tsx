import { useMemo } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { jumpToLine } from '@/lib/jumpToLine.ts'
import { cn } from './cn.ts'

interface BreakpointEntry {
  line: number
  preview: string
}

// Builds preview snippets — first 40 chars of each breakpoint line in
// the active file's source. Source is stable across the active file's
// life (only changes via setSource), so useMemo on source + breakpoints
// avoids per-render string slicing.
function buildEntries(source: string, lines: ReadonlySet<number>): BreakpointEntry[] {
  if (lines.size === 0) return []
  const sourceLines = source.split('\n')
  return [...lines]
    .sort((a, b) => a - b)
    .map((line) => {
      const text = sourceLines[line - 1] ?? ''
      const preview = text.length > 40 ? text.slice(0, 40) + '…' : text
      return { line, preview }
    })
}

export function BreakpointsPanel() {
  const breakpoints     = useSimulator((s) => s.breakpoints)
  const source          = useSimulator((s) => s.source)
  const files           = useSimulator((s) => s.files)
  const activeFileId    = useSimulator((s) => s.activeFileId)
  const toggle          = useSimulator((s) => s.toggleBreakpoint)
  const clearAll        = useSimulator((s) => s.clearAllBreakpoints)

  const activeName = files.find((f) => f.id === activeFileId)?.name ?? 'untitled'
  const entries    = useMemo(() => buildEntries(source, breakpoints), [source, breakpoints])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-7 flex-none items-center justify-between border-b border-divider px-3 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <span className="text-ink-2">Breakpoints</span>
        <button
          type="button"
          onClick={clearAll}
          disabled={entries.length === 0}
          className={cn(
            'rounded-sm px-2 py-0.5 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
            entries.length === 0
              ? 'cursor-not-allowed text-ink-3'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
          )}
        >
          Clear All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-3 py-3 text-xs italic text-ink-3">
            No breakpoints in {activeName}. Click in the editor's gutter to set one.
          </div>
        ) : (
          <ul className="divide-y divide-divider/40">
            {entries.map((entry) => (
              <li key={entry.line} className="group flex items-center gap-2 px-3 py-1">
                <button
                  type="button"
                  onClick={() => jumpToLine(entry.line)}
                  className="flex flex-1 items-center gap-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2"
                  title={`Jump to line ${entry.line}`}
                >
                  <span aria-hidden="true" className="size-2 flex-none rounded-pill bg-danger" />
                  <span
                    className="flex-none font-mono text-[10px] tabular-nums text-ink-3"
                    style={{ letterSpacing: '0.04em' }}
                  >
                    L{entry.line}
                  </span>
                  <span className="flex-1 truncate font-mono text-[11px] text-ink-2">
                    {entry.preview || <em className="not-italic text-ink-3">(empty line)</em>}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggle(entry.line)}
                  aria-label={`Remove breakpoint at line ${entry.line}`}
                  title="Remove breakpoint"
                  className="size-5 flex-none rounded-sm text-base leading-none text-ink-3 opacity-0 transition-opacity hover:bg-surface-3 hover:text-ink-1 focus-visible:opacity-100 group-hover:opacity-70"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="flex-none border-t border-divider px-3 py-1 font-mono text-[10px] text-ink-3"
        style={{ letterSpacing: '0.04em' }}
      >
        active file: <span className="text-ink-2">{activeName}</span>
        <span className="ml-2">— other files' breakpoints stay persisted (switch tabs to view).</span>
      </div>
    </div>
  )
}
