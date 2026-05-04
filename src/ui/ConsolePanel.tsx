import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { ConsoleEmpty } from './ConsoleEmpty.tsx'
import { ConsoleInputField } from './ConsoleInputField.tsx'
import { cn } from './cn.ts'

const MAX_VISIBLE_LINES = 1000
const AUTO_SCROLL_THRESHOLD = 16  // px from bottom — within this counts as "at bottom"

export function ConsolePanel() {
  // Phase 3 follow-up: render the full consoleBuffer in a single
  // <pre> element. The previous "one <pre> per array element"
  // approach interacted badly with React's reconciliation when the
  // buffer was split on newlines, dropping the first character of
  // every line in the visible output. A single <pre> with whitespace
  // preserved sidesteps the issue entirely (browsers render \n in
  // pre as line breaks natively).
  const buffer       = useSimulator((s) => s.consoleBuffer)
  const filter       = useSimulator((s) => s.consoleFilter)
  const setFilter    = useSimulator((s) => s.setConsoleFilter)
  const clearConsole = useSimulator((s) => s.clearConsole)
  const pending      = useSimulator((s) => s.pendingInput)
  const pendingKey   = useSimulator((s) => s.pendingInput?.kind ?? 'idle')

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [atBottom, setAtBottom] = useState(true)

  // Filter (case-insensitive substring) + windowing on a per-line
  // basis. The visible string joins surviving lines back with \n so
  // the single <pre> renders them as actual line breaks.
  const { visibleText, hiddenCount } = useMemo(() => {
    const allLines = buffer.split('\n')
    const filtered = filter
      ? allLines.filter((line) => line.toLowerCase().includes(filter.toLowerCase()))
      : allLines
    if (filtered.length <= MAX_VISIBLE_LINES) {
      return { visibleText: filtered.join('\n'), hiddenCount: 0 }
    }
    const tail = filtered.slice(-MAX_VISIBLE_LINES)
    return { visibleText: tail.join('\n'), hiddenCount: filtered.length - MAX_VISIBLE_LINES }
  }, [buffer, filter])

  useEffect(() => {
    if (!atBottom) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [visibleText, atBottom])

  function handleScroll(): void {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const next = distanceFromBottom <= AUTO_SCROLL_THRESHOLD
    if (next !== atBottom) setAtBottom(next)
  }

  function handleCopy(): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    void navigator.clipboard.writeText(buffer)
  }

  function scrollToBottom(): void {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(true)
    el.scrollTop = el.scrollHeight
  }

  const hasContent = visibleText.length > 0 || hiddenCount > 0
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
          disabled={buffer.length === 0}
          className={cn(
            'rounded-sm px-2 py-0.5 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
            buffer.length === 0
              ? 'cursor-not-allowed text-ink-3'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
          )}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={buffer.length === 0}
          title="Copy console output to clipboard"
          className={cn(
            'rounded-sm px-2 py-0.5 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
            buffer.length === 0
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
            {/* Single <pre> for the entire visible buffer. Browsers
               render \n in pre as line breaks natively, so we don't
               need per-line elements. The prior approach lost the
               first character of every line on multi-line output. */}
            <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-ink-1">{visibleText}</pre>
          </div>
        )}
      </div>

      {/* Input field — only renders when the simulator is suspended
         on a read syscall (pendingInput !== null). Keyed by the
         pending reference so the field re-mounts (resetting value +
         re-focusing) every time the engine starts a new read. */}
      {pending !== null && <ConsoleInputField key={pendingKey} pending={pending} />}
    </div>
  )
}
