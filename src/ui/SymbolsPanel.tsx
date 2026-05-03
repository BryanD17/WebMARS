import { useMemo } from 'react'
import { useSimulator, type NumberBase } from '@/hooks/useSimulator.ts'
import { jumpToLine } from '@/lib/jumpToLine.ts'
import { cn } from './cn.ts'

// Segment classification matches src/core/memory.ts. The .text segment
// shows up in program.sourceMap so each label resolves directly to a
// source line; .data labels don't have sourceMap entries (the engine
// only maps text addresses to lines), so we scan the source for the
// label declaration as a fallback.
const TEXT_BASE = 0x00400000
const TEXT_END  = 0x10000000
const DATA_BASE = 0x10010000

type Segment = 'text' | 'data' | 'other'

interface SymbolEntry {
  name: string
  addr: number
  segment: Segment
  line: number | null
}

function classify(addr: number): Segment {
  if (addr >= TEXT_BASE && addr < TEXT_END) return 'text'
  if (addr >= DATA_BASE && addr < 0x7ff00000) return 'data'
  return 'other'
}

function formatAddr(addr: number, base: NumberBase): string {
  switch (base) {
    case 'hex': return '0x' + (addr >>> 0).toString(16).padStart(8, '0')
    case 'dec': return String(addr >>> 0)
    case 'bin': return '0b' + (addr >>> 0).toString(2).padStart(32, '0')
  }
}

// Cheap source-line lookup for data labels — a regex scan is fine
// because the source is already in memory and labels are typically
// declared once at column 0.
function findLabelLine(source: string, name: string): number | null {
  const lines = source.split('\n')
  const re = new RegExp('^\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line !== undefined && re.test(line)) return i + 1
  }
  return null
}

function buildEntries(
  labels: Map<string, number> | undefined,
  sourceMap: Map<number, number> | undefined,
  source: string,
): SymbolEntry[] {
  if (!labels || labels.size === 0) return []
  const entries: SymbolEntry[] = []
  for (const [name, addr] of labels) {
    const segment = classify(addr)
    let line: number | null = null
    if (segment === 'text' && sourceMap) {
      line = sourceMap.get(addr) ?? null
    }
    if (line === null) line = findLabelLine(source, name)
    entries.push({ name, addr, segment, line })
  }
  // Group: text first, then data, then other; alphabetical within each
  // group so the panel reads like a deduplicated table of contents.
  const order: Record<Segment, number> = { text: 0, data: 1, other: 2 }
  entries.sort((a, b) => {
    const seg = order[a.segment] - order[b.segment]
    if (seg !== 0) return seg
    return a.name.localeCompare(b.name)
  })
  return entries
}

const SEGMENT_LABEL: Record<Segment, string> = {
  text:  '.text',
  data:  '.data',
  other: '—',
}

export function SymbolsPanel() {
  const program     = useSimulator((s) => s.program)
  const source      = useSimulator((s) => s.source)
  const numberBase  = useSimulator((s) => s.numberBase)

  const entries = useMemo(
    () => buildEntries(program?.labels, program?.sourceMap, source),
    [program, source],
  )

  // Group display: render a section header before each segment change.
  const sections = useMemo(() => {
    const out: { segment: Segment; rows: SymbolEntry[] }[] = []
    let current: { segment: Segment; rows: SymbolEntry[] } | null = null
    for (const entry of entries) {
      if (!current || current.segment !== entry.segment) {
        current = { segment: entry.segment, rows: [] }
        out.push(current)
      }
      current.rows.push(entry)
    }
    return out
  }, [entries])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-7 flex-none items-center justify-between border-b border-divider px-3 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <span className="text-ink-2">Symbols</span>
        <span className="text-ink-3">{entries.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!program ? (
          <div className="px-3 py-3 text-xs italic text-ink-3">
            Assemble a program to populate the symbol table.
          </div>
        ) : entries.length === 0 ? (
          <div className="px-3 py-3 text-xs italic text-ink-3">
            No labels in the current program.
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.segment}>
              <header
                className="sticky top-0 z-10 border-b border-divider/60 bg-surface-1 px-3 py-1 font-mono text-[10px] uppercase text-ink-3"
                style={{ letterSpacing: '0.06em' }}
              >
                {SEGMENT_LABEL[section.segment]}
                <span className="ml-2 normal-case text-ink-3">
                  ({section.rows.length})
                </span>
              </header>
              <ul className="divide-y divide-divider/40">
                {section.rows.map((entry) => (
                  <li key={`${entry.segment}-${entry.name}`} className="group">
                    <button
                      type="button"
                      onClick={() => {
                        if (entry.line !== null) jumpToLine(entry.line)
                      }}
                      disabled={entry.line === null}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-1 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:bg-surface-2',
                        entry.line !== null
                          ? 'hover:bg-surface-2'
                          : 'cursor-not-allowed opacity-60',
                      )}
                      title={
                        entry.line !== null
                          ? `Jump to ${entry.name} (line ${entry.line})`
                          : `${entry.name} — source line not available`
                      }
                    >
                      <span className="flex-1 truncate font-mono text-[11px] text-ink-1">
                        {entry.name}
                      </span>
                      <span
                        className="flex-none font-mono text-[10px] tabular-nums text-ink-3"
                        style={{ letterSpacing: '0.04em' }}
                      >
                        {formatAddr(entry.addr, numberBase)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
