import { useSimulator } from '@/hooks/useSimulator.ts'

// Placeholder until SA-3 wires this to the multi-file slice.
// SA-1 shows a single inert tab if there's source loaded so the band
// reads as "the place files appear" rather than an empty void.
export function TabStrip() {
  const sourceLength = useSimulator((s) => s.source.length)
  const hasSource = sourceLength > 0

  return (
    <div
      role="tablist"
      aria-label="Open files"
      className="flex h-9 items-stretch border-b border-divider bg-surface-0 px-3 font-mono text-xs"
      style={{ letterSpacing: '0.04em' }}
    >
      {hasSource ? (
        <button
          type="button"
          role="tab"
          aria-selected="true"
          tabIndex={0}
          className="flex items-center gap-2 border-b-2 border-accent bg-surface-1 px-3 text-ink-1"
        >
          <span aria-hidden="true" className="size-1.5 rounded-pill bg-accent" />
          untitled.asm
        </button>
      ) : (
        <span className="flex items-center text-ink-3">(no files yet — SA-3 wires this)</span>
      )}
    </div>
  )
}
