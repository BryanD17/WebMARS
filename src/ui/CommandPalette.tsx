import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { buildCommands, fuzzyMatch, type Command } from '@/lib/commands.ts'
import { cn } from './cn.ts'

interface ScoredCommand {
  cmd: Command
  score: number
}

// Outer wrapper handles the open/close gate. The inner dialog mounts
// fresh every time the palette opens, so query + activeIdx initialize
// to their defaults via useState — no synchronizing effects required.
export function CommandPalette() {
  const open = useSimulator((s) => s.commandPaletteOpen)
  if (!open) return null
  return <PaletteBody />
}

function PaletteBody() {
  const close = useSimulator((s) => s.closeCommandPalette)

  const [query, setQuery]         = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLUListElement>(null)

  // Captured at mount — palette opens with a fresh snapshot of the
  // store, including disabled flags / status / file state.
  const commands = useMemo<Command[]>(() => buildCommands(), [])

  const filtered: ScoredCommand[] = useMemo(() => {
    if (query.trim().length === 0) {
      return commands.map((cmd) => ({ cmd, score: 0 }))
    }
    const matches: ScoredCommand[] = []
    for (const cmd of commands) {
      const labelScore = fuzzyMatch(cmd.label, query)
      const groupScore = fuzzyMatch(cmd.group, query)
      const score =
        labelScore !== null && groupScore !== null
          ? Math.min(labelScore, groupScore + 5)
          : labelScore ?? (groupScore !== null ? groupScore + 10 : null)
      if (score !== null) matches.push({ cmd, score })
    }
    matches.sort((a, b) => a.score - b.score)
    return matches
  }, [commands, query])

  // Derive a clamped index instead of synchronizing via an effect —
  // the activeIdx state can outlive a filter pass that shrinks the
  // list. Math.min keeps the focus on the last item; the next arrow-
  // key keystroke updates the underlying state.
  const safeIdx = filtered.length === 0 ? 0 : Math.min(activeIdx, filtered.length - 1)

  // Focus the input on first paint. setTimeout 0 lets the browser
  // attach the input element to the DOM before requesting focus.
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [])

  // Scroll the active item into view as arrow-keys move it.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const el = list.querySelector<HTMLElement>(`[data-idx="${safeIdx}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [safeIdx])

  function handleKey(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIdx((prev) => Math.min(prev + 1, Math.max(0, filtered.length - 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIdx((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const entry = filtered[safeIdx]
      if (entry && !entry.cmd.disabled) {
        close()
        entry.cmd.run()
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10vh] backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        className="flex max-h-[70vh] w-[36rem] flex-col overflow-hidden rounded-md border border-divider bg-surface-1 shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-divider px-3 py-2">
          <span aria-hidden="true" className="font-mono text-sm text-ink-3">›</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIdx(0) }}
            onKeyDown={handleKey}
            placeholder="Type a command…"
            aria-label="Command query"
            aria-autocomplete="list"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filtered.length > 0 ? `command-palette-${filtered[safeIdx]?.cmd.id ?? ''}` : undefined
            }
            className="flex-1 bg-transparent font-mono text-sm text-ink-1 placeholder:text-ink-3 focus-visible:outline-none"
          />
          <span
            className="font-mono text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: '0.06em' }}
          >
            {filtered.length}/{commands.length}
          </span>
        </div>

        <ul
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Available commands"
          className="flex-1 overflow-y-auto py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-xs italic text-ink-3">No matching commands.</li>
          ) : (
            filtered.map((entry, idx) => (
              <li
                key={entry.cmd.id}
                id={`command-palette-${entry.cmd.id}`}
                data-idx={idx}
                role="option"
                aria-selected={idx === safeIdx}
                aria-disabled={entry.cmd.disabled ?? false}
              >
                <button
                  type="button"
                  disabled={entry.cmd.disabled}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => {
                    if (entry.cmd.disabled) return
                    close()
                    entry.cmd.run()
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition-colors',
                    entry.cmd.disabled && 'cursor-not-allowed text-ink-3',
                    !entry.cmd.disabled && idx === safeIdx && 'bg-surface-3 text-ink-1',
                    !entry.cmd.disabled && idx !== safeIdx && 'text-ink-2 hover:bg-surface-2',
                  )}
                >
                  <span className="flex flex-1 items-center gap-2 truncate">
                    <span
                      className="font-mono text-[10px] uppercase text-ink-3"
                      style={{ letterSpacing: '0.06em', minWidth: '4.5rem' }}
                    >
                      {entry.cmd.group}
                    </span>
                    <span className="truncate">{entry.cmd.label}</span>
                  </span>
                  {entry.cmd.shortcut && (
                    <span
                      className="flex-none font-mono text-[10px] text-ink-3"
                      style={{ letterSpacing: '0.04em' }}
                    >
                      {entry.cmd.shortcut}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>

        <footer
          className="flex flex-none items-center justify-between border-t border-divider px-3 py-1 font-mono text-[10px] text-ink-3"
          style={{ letterSpacing: '0.04em' }}
        >
          <span>↑↓ navigate · Enter run · Esc close</span>
          <span>Ctrl+Shift+P</span>
        </footer>
      </div>
    </div>
  )
}
