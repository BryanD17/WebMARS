import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import {
  useSimulator,
  type MemoryViewSegment,
  type NumberBase,
  SEGMENT_BASES,
} from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

const WORDS_PER_ROW = 8
const SEGMENT_LABELS: Record<MemoryViewSegment, string> = {
  text:  '.text',
  data:  '.data',
  stack: 'stack',
}

function formatWord(word: number, base: NumberBase): string {
  const u = word >>> 0
  switch (base) {
    case 'hex': return '0x' + u.toString(16).padStart(8, '0')
    case 'dec': return ((word | 0)).toString(10)
    case 'bin': return '0b' + u.toString(2).padStart(32, '0')
  }
}

function formatAddress(addr: number): string {
  return '0x' + (addr >>> 0).toString(16).padStart(8, '0')
}

// Render the 4 bytes of a word as printable ASCII or '.' for
// non-printable. Little-endian (byte 0 is the low byte).
function asciiOfWord(word: number): string {
  const u = word >>> 0
  const bytes = [u & 0xff, (u >>> 8) & 0xff, (u >>> 16) & 0xff, (u >>> 24) & 0xff]
  return bytes
    .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
    .join('')
}

function parseValue(raw: string, base: NumberBase): number | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  // Accept any base prefix regardless of current display base — power
  // users often paste 0xDEADBEEF when DEC is active.
  if (trimmed.startsWith('0x')) {
    const n = parseInt(trimmed.slice(2), 16)
    return Number.isFinite(n) ? n : null
  }
  if (trimmed.startsWith('0b')) {
    const n = parseInt(trimmed.slice(2), 2)
    return Number.isFinite(n) ? n : null
  }
  if (base === 'hex') {
    const n = parseInt(trimmed, 16)
    return Number.isFinite(n) ? n : null
  }
  if (base === 'bin') {
    const n = parseInt(trimmed, 2)
    return Number.isFinite(n) ? n : null
  }
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}

interface CellProps {
  addr: number
  word: number
  base: NumberBase
  changed: boolean
  editing: boolean
  canEdit: boolean
  onStartEdit: () => void
  onCommitEdit: (value: number) => void
  onCancelEdit: () => void
}

function MemoryCell({ addr, word, base, changed, editing, canEdit, onStartEdit, onCommitEdit, onCancelEdit }: CellProps) {
  const [raw, setRaw] = useState(() => formatWord(word, base))
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Mount-only focus when entering edit mode.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = parseValue(raw, base)
    if (parsed === null) {
      onCancelEdit()
      return
    }
    onCommitEdit(parsed)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancelEdit()
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="contents">
        <input
          ref={inputRef}
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCancelEdit()}
          className="border border-accent bg-surface-2 px-1 font-mono text-[11px] text-ink-1 tabular-nums focus:outline-none"
        />
      </form>
    )
  }

  const label = formatWord(word, base)
  const title = `${formatAddress(addr)} = ${formatWord(word, 'hex')} / ${formatWord(word, 'dec')}${canEdit ? ' (click to edit)' : ''}`

  return (
    <button
      type="button"
      onClick={canEdit ? onStartEdit : undefined}
      disabled={!canEdit}
      title={title}
      className={cn(
        'block min-w-[8ch] truncate text-right font-mono text-[11px] tabular-nums transition-colors',
        canEdit && 'cursor-pointer hover:bg-surface-3 hover:text-ink-1',
        !canEdit && 'cursor-default',
        word === 0 ? 'text-ink-3' : 'text-ink-1',
      )}
      style={{
        // 8ch covers hex; 11ch dec; 34ch bin. Keep values right-aligned.
        minWidth: base === 'bin' ? '34ch' : base === 'dec' ? '11ch' : '8ch',
        animation: changed ? 'flash-cell 600ms ease-out' : undefined,
      }}
    >
      {label}
    </button>
  )
}

interface RowProps {
  baseAddr: number
  words: ReadonlyArray<{ addr: number; word: number }>
  base: NumberBase
  changed: ReadonlySet<number>
  canEdit: boolean
  editingAddr: number | null
  onStartEdit: (addr: number) => void
  onCommitEdit: (addr: number, value: number) => void
  onCancelEdit: () => void
}

function MemoryRow({ baseAddr, words, base, changed, canEdit, editingAddr, onStartEdit, onCommitEdit, onCancelEdit }: RowProps) {
  // Pad row to WORDS_PER_ROW with synthetic empty cells if the engine
  // truncated the dump (end of mapped segment).
  const cells: Array<{ addr: number; word: number } | null> = []
  for (let i = 0; i < WORDS_PER_ROW; i++) {
    const expectedAddr = baseAddr + i * 4
    const found = words.find((w) => w.addr === expectedAddr)
    cells.push(found ?? null)
  }

  // ASCII column rendering uses concatenated bytes from the row's words.
  const ascii = cells
    .map((c) => (c ? asciiOfWord(c.word) : '    '))
    .join('')

  return (
    <div className="flex items-center gap-3 border-b border-divider/40 px-2 py-0.5">
      <span
        className="flex-none font-mono text-[10px] text-ink-3"
        style={{ letterSpacing: '0.04em' }}
      >
        {formatAddress(baseAddr)}
      </span>
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {cells.map((cell, i) => {
          const expectedAddr = baseAddr + i * 4
          if (!cell) {
            return (
              <span
                key={expectedAddr}
                className="block min-w-[8ch] text-right font-mono text-[11px] tabular-nums text-ink-3"
              >
                —
              </span>
            )
          }
          return (
            <MemoryCell
              key={cell.addr}
              addr={cell.addr}
              word={cell.word}
              base={base}
              changed={changed.has(cell.addr)}
              editing={editingAddr === cell.addr}
              canEdit={canEdit}
              onStartEdit={() => onStartEdit(cell.addr)}
              onCommitEdit={(value) => onCommitEdit(cell.addr, value)}
              onCancelEdit={onCancelEdit}
            />
          )
        })}
      </div>
      <span
        className="flex-none truncate font-mono text-[10px] text-ink-3"
        title={ascii}
        style={{ letterSpacing: '0', maxWidth: '8ch' }}
      >
        {ascii}
      </span>
    </div>
  )
}

const SEGMENTS: ReadonlyArray<MemoryViewSegment> = ['text', 'data', 'stack']

export function MemoryPanel() {
  const segment        = useSimulator((s) => s.memoryViewSegment)
  const base           = useSimulator((s) => s.memoryViewBase)
  const memoryWords    = useSimulator((s) => s.memoryWords)
  const memoryChanged  = useSimulator((s) => s.memoryChanged)
  const numberBase     = useSimulator((s) => s.numberBase)
  const status         = useSimulator((s) => s.status)
  const setSegment     = useSimulator((s) => s.setMemoryViewSegment)
  const setBase        = useSimulator((s) => s.setMemoryViewBase)
  const refreshMemory  = useSimulator((s) => s.refreshMemorySnapshot)
  const writeMemoryWord = useSimulator((s) => s.writeMemoryWord)

  const [editingAddr, setEditingAddr] = useState<number | null>(null)
  const [baseInputDraft, setBaseInputDraft] = useState<string | null>(null)

  // Memory-write edits are only safe when the program isn't actively
  // running. Allow during paused / ready / halted.
  const canEdit = status === 'paused' || status === 'ready' || status === 'halted'

  // Pull a fresh snapshot if the panel mounts without one (e.g.
  // user opened the Memory accordion before clicking Assemble).
  useEffect(() => {
    if (memoryWords.length === 0) refreshMemory()
  }, [memoryWords.length, refreshMemory])

  function handleBaseInputCommit(): void {
    if (baseInputDraft === null) return
    const trimmed = baseInputDraft.trim()
    setBaseInputDraft(null)
    if (!trimmed) return
    const parsed = trimmed.toLowerCase().startsWith('0x')
      ? parseInt(trimmed.slice(2), 16)
      : parseInt(trimmed, 10)
    if (Number.isFinite(parsed)) {
      setBase(parsed >>> 0)
    }
  }

  // Build the rows from memoryWords by chunking into WORDS_PER_ROW.
  const rows: Array<{ addr: number; words: typeof memoryWords }> = []
  if (memoryWords.length > 0) {
    for (let i = 0; i < memoryWords.length; i += WORDS_PER_ROW) {
      const slice = memoryWords.slice(i, i + WORDS_PER_ROW)
      const first = slice[0]
      if (first) rows.push({ addr: first.addr, words: slice })
    }
  }

  return (
    <div className="space-y-2">
      {/* Header: segment buttons + base address input */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Memory segment" className="inline-flex overflow-hidden rounded-md border border-divider">
          {SEGMENTS.map((seg, i) => {
            const active = segment === seg
            return (
              <button
                key={seg}
                type="button"
                aria-pressed={active}
                onClick={() => setSegment(seg)}
                className={cn(
                  'px-2 py-1 font-mono text-xs uppercase transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                  i > 0 && 'border-l border-divider',
                  active
                    ? 'bg-surface-2 text-ink-1'
                    : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2',
                )}
                style={{ letterSpacing: '0.06em' }}
              >
                {SEGMENT_LABELS[seg]}
              </button>
            )
          })}
        </div>

        <input
          type="text"
          value={baseInputDraft ?? formatAddress(base)}
          onFocus={() => setBaseInputDraft(formatAddress(base))}
          onChange={(e) => setBaseInputDraft(e.target.value)}
          onBlur={handleBaseInputCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBaseInputCommit()
            if (e.key === 'Escape') setBaseInputDraft(null)
          }}
          aria-label="Memory view base address"
          spellCheck={false}
          className="w-[12ch] rounded-sm border border-divider bg-surface-2 px-2 py-1 font-mono text-xs tabular-nums text-ink-1 focus-visible:outline-none focus-visible:border-accent"
        />

        <button
          type="button"
          onClick={() => setBase(SEGMENT_BASES[segment])}
          title={`Reset to ${formatAddress(SEGMENT_BASES[segment])}`}
          className="rounded-sm px-2 py-1 font-mono text-[10px] uppercase text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          style={{ letterSpacing: '0.06em' }}
        >
          Reset
        </button>
      </div>

      {/* Body */}
      <div className="overflow-hidden rounded-md border border-divider bg-surface-1">
        {rows.length === 0 ? (
          <div className="px-3 py-4 text-xs italic text-ink-3">
            Click Assemble to populate memory.
          </div>
        ) : (
          rows.map((row) => (
            <MemoryRow
              key={row.addr}
              baseAddr={row.addr}
              words={row.words}
              base={numberBase}
              changed={memoryChanged}
              canEdit={canEdit}
              editingAddr={editingAddr}
              onStartEdit={(addr) => setEditingAddr(addr)}
              onCommitEdit={(addr, value) => {
                writeMemoryWord(addr, value)
                setEditingAddr(null)
              }}
              onCancelEdit={() => setEditingAddr(null)}
            />
          ))
        )}
      </div>

      {!canEdit && (
        <div
          className="font-mono text-[10px] italic text-ink-3"
          style={{ letterSpacing: '0.04em' }}
        >
          Edit-in-place available when paused / halted / ready.
        </div>
      )}
    </div>
  )
}
