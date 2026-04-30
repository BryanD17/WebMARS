import { useSimulator } from '@/hooks/useSimulator.ts'

export function SourcePane() {
  const source = useSimulator((s) => s.source)
  const setSource = useSimulator((s) => s.setSource)

  return (
    <section
      aria-label="Source editor"
      className="flex min-h-0 min-w-0 flex-col border-divider bg-surface-1 lg:border-r"
    >
      <label htmlFor="source-editor" className="sr-only">
        MIPS assembly source
      </label>
      <textarea
        id="source-editor"
        value={source}
        onChange={(event) => setSource(event.target.value)}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        placeholder="# Type MIPS assembly here. Monaco wires in on Day 2."
        className="flex-1 resize-none bg-surface-1 px-4 py-3 font-mono text-sm leading-6 text-ink-1 placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      />
    </section>
  )
}
