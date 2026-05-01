import { useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

const MIN_VISIBLE_LINES = 20

function lineCountFor(source: string): number {
  if (source.length === 0) return MIN_VISIBLE_LINES
  return Math.max(MIN_VISIBLE_LINES, source.split('\n').length)
}

export function SourcePane() {
  const source = useSimulator((s) => s.source)
  const setSource = useSimulator((s) => s.setSource)
  const [focused, setFocused] = useState(false)

  const lineCount = lineCountFor(source)

  return (
    <section
      aria-label="Source editor"
      className="flex min-h-0 min-w-0 flex-col border-divider bg-surface-0 lg:border-r"
    >
      <label htmlFor="source-editor" className="sr-only">
        MIPS assembly source
      </label>

      <div
        className="flex flex-1 overflow-hidden font-mono text-base"
        style={{ lineHeight: 1.5 }}
      >
        {/* Line-number gutter — moves to Monaco config on Day 2 */}
        <div
          aria-hidden="true"
          className={cn(
            'flex w-10 flex-none flex-col items-end overflow-hidden pr-3 pt-2 font-mono text-sm text-ink-3 transition-colors',
            focused ? 'bg-surface-2' : 'bg-gutter',
          )}
          style={{ lineHeight: 1.5, transitionDuration: '120ms' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i + 1}>{i + 1}</span>
          ))}
        </div>

        {/* Editor body — relative wrapper so the 80-col guide can sit on top */}
        <div className="relative flex-1">
          <textarea
            id="source-editor"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="# Type MIPS assembly here. Monaco wires in on Day 2."
            className="absolute inset-0 resize-none bg-transparent px-4 pb-2 pt-2 font-mono text-base text-ink-1 placeholder:text-ink-3 focus:outline-none"
            style={{ lineHeight: 1.5, tabSize: 4 }}
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
