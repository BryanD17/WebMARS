import { useSimulator } from '@/hooks/useSimulator.ts'
import type { AssemblerError, RuntimeError } from '@/hooks/types.ts'
import { jumpToLine } from '@/lib/jumpToLine.ts'
import { cn } from './cn.ts'

interface ProblemRow {
  kind: 'assemble' | 'runtime'
  line: number | null   // null when the problem isn't tied to a source line (e.g. runtime PC without sourcemap)
  message: string
  source: string
}

function buildProblems(
  assemblerErrors: ReadonlyArray<AssemblerError>,
  runtimeError: RuntimeError | null,
  activeFileName: string,
): ReadonlyArray<ProblemRow> {
  const rows: ProblemRow[] = assemblerErrors.map((e) => ({
    kind:    'assemble',
    line:    e.line,
    message: e.message,
    source:  activeFileName,
  }))
  if (runtimeError) {
    rows.push({
      kind:    'runtime',
      // Runtime errors carry a PC, not a source line. SA-9 hooks the
      // PC→line map; for now show the PC as the "location".
      line:    null,
      message: `${runtimeError.message} (pc=0x${(runtimeError.pc >>> 0).toString(16).padStart(8, '0')})`,
      source:  activeFileName,
    })
  }
  return rows
}

function ProblemRow({ row }: { row: ProblemRow }) {
  const clickable = row.line !== null
  const glyph     = row.kind === 'assemble' ? '✕' : '!'
  const tone      = 'text-danger'

  const handleClick = clickable
    ? () => jumpToLine(row.line!)
    : undefined

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!clickable}
      title={clickable ? `Jump to line ${String(row.line)}` : 'No source line associated'}
      className={cn(
        'grid w-full items-baseline gap-3 px-3 py-1 text-left font-mono text-xs',
        'focus-visible:outline-none focus-visible:bg-surface-2',
        clickable
          ? 'cursor-pointer hover:bg-surface-2'
          : 'cursor-not-allowed',
      )}
      style={{ gridTemplateColumns: 'auto auto 1fr auto' }}
    >
      <span aria-hidden="true" className={cn('flex-none', tone)}>{glyph}</span>
      <span
        aria-hidden="true"
        className="flex-none font-mono text-[10px] text-ink-3"
        style={{ letterSpacing: '0.04em' }}
      >
        {row.line !== null ? `L${row.line}` : '—'}
      </span>
      <span className="flex-1 text-ink-1">{row.message}</span>
      <span
        aria-hidden="true"
        className="flex-none truncate font-mono text-[10px] text-ink-3"
        style={{ letterSpacing: '0.04em', maxWidth: '12rem' }}
      >
        {row.source}
      </span>
    </button>
  )
}

export function ProblemsPanel() {
  const assemblerErrors = useSimulator((s) => s.assemblerErrors)
  const runtimeError    = useSimulator((s) => s.runtimeError)
  const files           = useSimulator((s) => s.files)
  const activeFileId    = useSimulator((s) => s.activeFileId)

  const activeName = files.find((f) => f.id === activeFileId)?.name ?? '—'
  const problems   = buildProblems(assemblerErrors, runtimeError, activeName)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-6 flex-none items-center gap-2 border-b border-divider px-2 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <span className="ml-auto">
          {problems.length} problem{problems.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {problems.length === 0 ? (
          <div className="px-3 py-2 text-xs italic text-ink-3">
            No problems detected. Assembler and runtime errors will appear here, click-to-jump to the offending line.
          </div>
        ) : (
          problems.map((row, i) => (
            <ProblemRow key={`${row.kind}-${i}-${row.message}`} row={row} />
          ))
        )}
      </div>
    </div>
  )
}
