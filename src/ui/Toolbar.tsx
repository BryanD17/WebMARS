import { useSimulator } from '@/hooks/useSimulator.ts'
import { Button } from './Button.tsx'
import { StatusPill } from './StatusPill.tsx'
import { cn } from './cn.ts'

// Disabled-placeholder button used for actions wired in later
// sub-agents (file ops → SA-2, edit ops → SA-4 when Monaco lands,
// run-loop ops → SA-10).
function PlaceholderButton({ label, title }: { label: string; title: string }) {
  return (
    <button
      type="button"
      disabled
      title={title}
      className={cn(
        'rounded-sm px-2 py-1 text-xs font-medium',
        'cursor-not-allowed bg-surface-2 text-ink-3',
      )}
    >
      {label}
    </button>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px bg-divider" />
}

export function Toolbar() {
  const source   = useSimulator((s) => s.source)
  const assemble = useSimulator((s) => s.assemble)
  const run      = useSimulator((s) => s.run)
  const step     = useSimulator((s) => s.step)
  const reset    = useSimulator((s) => s.reset)

  const noSource = source.length === 0

  return (
    <div
      role="toolbar"
      aria-label="Primary toolbar"
      className="flex h-11 items-center gap-1 overflow-x-auto border-b border-divider bg-surface-1 px-3"
    >
      {/* File ops — wired in SA-2 */}
      <div className="flex items-center gap-1" aria-label="File operations">
        <PlaceholderButton label="New"       title="New file (Ctrl+N) — wired in SA-2" />
        <PlaceholderButton label="Open"      title="Open file (Ctrl+O) — wired in SA-2" />
        <PlaceholderButton label="Save"      title="Save (Ctrl+S) — wired in SA-2" />
        <PlaceholderButton label="Save All"  title="Save All — wired in SA-2" />
      </div>

      <Divider />

      {/* Edit ops — wired in SA-4 (Monaco brings find/replace/undo) */}
      <div className="flex items-center gap-1" aria-label="Edit operations">
        <PlaceholderButton label="Undo"  title="Undo (Ctrl+Z) — Monaco wires this in SA-4" />
        <PlaceholderButton label="Redo"  title="Redo (Ctrl+Shift+Z) — Monaco wires this in SA-4" />
        <PlaceholderButton label="Find"  title="Find (Ctrl+F) — Monaco wires this in SA-4" />
      </div>

      <Divider />

      {/* Runtime ops — Assemble / Run / Step / Reset live; the rest
         placeholdered until SA-10 lands the run-loop control set. */}
      <nav className="flex items-center gap-1" aria-label="Simulator controls">
        <Button
          variant="primary"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={assemble}
          className="px-2 py-1 text-xs"
        >
          Assemble
        </Button>
        <Button
          variant="ghost"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={run}
          className="px-2 py-1 text-xs"
        >
          Run
        </Button>
        <PlaceholderButton label="Pause"        title="Pause (F6) — wired in SA-10" />
        <Button
          variant="ghost"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={step}
          className="px-2 py-1 text-xs"
        >
          Step
        </Button>
        <PlaceholderButton label="Backstep"     title="Backstep (Shift+F7) — wired in SA-10" />
        <PlaceholderButton label="→ Cursor"     title="Run to cursor (F8) — wired in SA-10" />
        <Button
          variant="ghost"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={reset}
          className="ml-2 px-2 py-1 text-xs"
        >
          Reset
        </Button>
      </nav>

      <Divider />

      {/* Speed slider — wired in SA-10. Visual placeholder for now. */}
      <div className="flex items-center gap-2 text-xs text-ink-3" aria-label="Run speed">
        <span style={{ letterSpacing: '0.04em' }}>Speed</span>
        <input
          type="range"
          min={0}
          max={7}
          defaultValue={7}
          disabled
          className="h-1 w-24 cursor-not-allowed accent-accent opacity-50"
          aria-label="Run speed (wired in SA-10)"
        />
        <span className="font-mono text-[10px]">∞</span>
      </div>

      {/* Right side: spacer pushes StatusPill to the far edge. */}
      <span className="flex-1" aria-hidden="true" />

      <StatusPill />
    </div>
  )
}
