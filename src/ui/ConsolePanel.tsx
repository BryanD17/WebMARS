import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { ConsoleEmpty } from './ConsoleEmpty.tsx'
import { cn } from './cn.ts'

const MAX_VISIBLE_LINES = 1000
const AUTO_SCROLL_THRESHOLD = 16  // px from bottom — within this counts as "at bottom"

export function ConsolePanel() {
  const lines        = useSimulator((s) => s.consoleOutput)
  const filter       = useSimulator((s) => s.consoleFilter)
  const setFilter    = useSimulator((s) => s.setConsoleFilter)
  const clearConsole = useSimulator((s) => s.clearConsole)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  // atBottom drives both effects (auto-scroll on new output) and
  // render (the "↓ latest" affordance), so it lives in state.
  const [atBottom, setAtBottom] = useState(true)

  // Filter (case-insensitive substring) + windowing — render only the
  // last MAX_VISIBLE_LINES so very long programs don't blow up the
  // DOM. The (N earlier hidden) hint surfaces the omission.
  const { displayLines, hiddenCount } = useMemo(() => {
    const filtered = filter
      ? lines.filter((line) => line.toLowerCase().includes(filter.toLowerCase()))
      : lines
    if (filtered.length <= MAX_VISIBLE_LINES) {
      return { displayLines: filtered, hiddenCount: 0 }
    }
    return {
      displayLines: filtered.slice(-MAX_VISIBLE_LINES),
      hiddenCount: filtered.length - MAX_VISIBLE_LINES,
    }
  }, [lines, filter])

  // Auto-scroll to bottom on new output, but only if the user hasn't
  // scrolled up.
  useEffect(() => {
    if (!atBottom) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [displayLines, atBottom])

  function handleScroll(): void {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const next = distanceFromBottom <= AUTO_SCROLL_THRESHOLD
    if (next !== atBottom) setAtBottom(next)
  }

  function handleCopy(): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    void navigator.clipboard.writeText(lines.join(''))
  }

  function scrollToBottom(): void {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(true)
    el.scrollTop = el.scrollHeight
  }

  const hasContent = displayLines.length > 0 || hiddenCount > 0
  const showJumpToBottom = !atBottom && hasContent

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header (24px): Clear / Copy + filter */}
      <div
        className="flex h-6 flex-none items-center gap-2 border-b border-divider px-2 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <button
          type="button"
          onClick={clearConsole}
          disabled={lines.length === 0}
          className={cn(
            'rounded-sm px-2 py-0.5 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
            lines.length === 0
              ? 'cursor-not-allowed text-ink-3'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
          )}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={lines.length === 0}
          title="Copy console output to clipboard"
          className={cn(
            'rounded-sm px-2 py-0.5 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
            lines.length === 0
              ? 'cursor-not-allowed text-ink-3'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
          )}
        >
          Copy
        </button>

        <span aria-hidden="true" className="ml-1 text-ink-3">·</span>

        <input
          type="text"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter…"
          aria-label="Filter console output"
          className="ml-1 flex-1 rounded-sm border border-divider bg-surface-2 px-2 py-0.5 font-mono text-[11px] normal-case text-ink-1 placeholder:text-ink-3 focus-visible:outline-none focus-visible:border-accent"
          style={{ letterSpacing: '0' }}
        />

        {showJumpToBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="ml-2 rounded-sm bg-accent px-2 py-0.5 text-surface-0 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Jump to latest output"
          >
            ↓ latest
          </button>
        )}
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {!hasContent ? (
          <ConsoleEmpty />
        ) : (
          <div className="font-mono text-xs text-ink-1">
            {hiddenCount > 0 && (
              <div
                className="mb-1 italic text-ink-3"
                aria-label={`${hiddenCount} earlier console lines hidden`}
              >
                ({hiddenCount} earlier line{hiddenCount === 1 ? '' : 's'} hidden — clear or filter to narrow)
              </div>
            )}
            {displayLines.map((line, i) => (
              <pre
                // Console output is append-only; index-as-key is safe.
                key={`line-${i}`}
                className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-ink-1"
              >
                {line}
              </pre>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
