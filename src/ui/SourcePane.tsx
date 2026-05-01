import { useEffect, useMemo, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

const MIN_VISIBLE_LINES = 20
// Editor body and gutter share the same monospace text-base + 1.5
// line-height so line N in the gutter aligns with line N in the
// textarea. line-height in px = 13 * 1.5 = 19.5; rounded to 20 for
// pixel-perfect math on the current-line indicator.
const LINE_HEIGHT_PX = 20
// Gutter has pt-2 (8px top padding) before its first line number.
const GUTTER_TOP_PADDING_PX = 8
// Debounce window for selectionStart updates so the current-line
// indicator doesn't repaint on every keystroke.
const SELECTION_DEBOUNCE_MS = 30

function lineCountFor(source: string): number {
  if (source.length === 0) return MIN_VISIBLE_LINES
  return Math.max(MIN_VISIBLE_LINES, source.split('\n').length)
}

function lineFromSelection(source: string, selectionStart: number): number {
  return source.slice(0, selectionStart).split('\n').length
}

export function SourcePane() {
  const source = useSimulator((s) => s.source)
  const setSource = useSimulator((s) => s.setSource)
  const [focused, setFocused] = useState(false)
  const [selectionStart, setSelectionStart] = useState(0)
  const debounceRef = useRef<number | null>(null)

  const lineCount = lineCountFor(source)
  const currentLine = useMemo(
    () => lineFromSelection(source, selectionStart),
    [source, selectionStart],
  )

  function handleSelectionEvent(event: SyntheticEvent<HTMLTextAreaElement>) {
    const next = event.currentTarget.selectionStart
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      setSelectionStart(next)
    }, SELECTION_DEBOUNCE_MS)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <section
      aria-label="Source editor"
      className="flex min-h-0 min-w-0 flex-col border-divider bg-surface-0 p-px lg:border-r"
    >
      <label htmlFor="source-editor" className="sr-only">
        MIPS assembly source
      </label>

      <div
        className="flex flex-1 overflow-hidden border border-divider font-mono text-base"
        style={{ lineHeight: `${LINE_HEIGHT_PX}px` }}
      >
        {/* Line-number gutter — moves to Monaco config on Day 2.
           1px right edge in --border so the gutter reads as a margin
           rule, not just a background-color shift. */}
        <div
          aria-hidden="true"
          className={cn(
            'relative flex w-10 flex-none flex-col items-end overflow-hidden border-r border-divider pr-3 pt-2 text-ink-3 transition-colors',
            focused ? 'bg-surface-2' : 'bg-gutter',
          )}
          style={{ transitionDuration: '120ms' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}

          {/* Current-line indicator — 1px --accent stripe hugging the
             gutter's right edge, sliding to whichever line the cursor
             is on. Hidden until the textarea is focused so the page
             doesn't read as having a stale active line on first paint. */}
          {focused && (
            <div
              aria-hidden="true"
              className="absolute right-0 w-px bg-accent transition-[top] ease-out"
              style={{
                top: `${GUTTER_TOP_PADDING_PX + (currentLine - 1) * LINE_HEIGHT_PX}px`,
                height: `${LINE_HEIGHT_PX}px`,
                transitionDuration: '60ms',
              }}
            />
          )}
        </div>

        {/* Editor body — relative wrapper so the 80-col guide can sit on top */}
        <div className="relative flex-1">
          <textarea
            id="source-editor"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSelect={handleSelectionEvent}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="# Type MIPS assembly here. Monaco wires in on Day 2."
            className="absolute inset-0 resize-none bg-transparent px-4 pb-2 pt-2 text-ink-1 placeholder:text-lg placeholder:text-ink-3 focus:outline-none"
            style={{ tabSize: 4 }}
          />
          {/* 80-character column guide. ch is font-aware; this wrapper
             inherits the editor body's font-mono + text-base, so the
             guide lands at exactly 80 monospace characters past the
             textarea's left padding. Day 2 moves this into Monaco's
             editor.rulers config. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-px bg-column-guide"
            style={{ left: 'calc(1rem + 80ch)' }}
          />
        </div>
      </div>
    </section>
  )
}
