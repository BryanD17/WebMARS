import { useEffect, useRef, useState } from 'react'
import { useSimulator, type ExampleName, RUN_SPEED_STOPS } from '@/hooks/useSimulator.ts'
import { getEditorCursor } from '@/lib/editorCursor.ts'
import { Button } from './Button.tsx'
import { StatusPill } from './StatusPill.tsx'
import { cn } from './cn.ts'

function speedLabel(speed: number): string {
  if (speed === 0) return '∞'
  return `${speed}/s`
}

function SpeedSlider() {
  const runSpeed    = useSimulator((s) => s.runSpeed)
  const setRunSpeed = useSimulator((s) => s.setRunSpeed)

  // The slider's value is the index into RUN_SPEED_STOPS; the
  // displayed label and the actual store value derive from that.
  const currentIndex = Math.max(0, RUN_SPEED_STOPS.indexOf(runSpeed))

  return (
    <div className="flex items-center gap-2 text-xs text-ink-3" aria-label="Run speed">
      <span style={{ letterSpacing: '0.04em' }}>Speed</span>
      <input
        type="range"
        min={0}
        max={RUN_SPEED_STOPS.length - 1}
        step={1}
        value={currentIndex}
        onChange={(event) => {
          const idx = Number(event.target.value)
          const next = RUN_SPEED_STOPS[idx]
          if (typeof next === 'number') setRunSpeed(next)
        }}
        className="h-1 w-24 cursor-pointer accent-accent"
        aria-label={`Run speed: ${speedLabel(runSpeed)} instructions per second`}
      />
      <span
        className="font-mono text-[10px] tabular-nums text-ink-2"
        style={{ letterSpacing: '0.04em', minWidth: '3.5ch' }}
      >
        {speedLabel(runSpeed)}
      </span>
    </div>
  )
}

const EXAMPLES: ReadonlyArray<{ id: ExampleName; label: string; desc: string }> = [
  { id: 'arraySum',    label: 'Array Sum',         desc: 'sum the elements of an int array' },
  { id: 'factorial',   label: 'Factorial',         desc: 'recursive n! with jal/jr' },
  { id: 'stringPrint', label: 'String Print',      desc: 'print a literal via syscall 4' },
  { id: 'sumToN',      label: 'Sum 1..N',          desc: 'read N, print 1+2+…+N' },
  { id: 'syscallIO',   label: 'Syscall I/O',       desc: 'read int, print int (full I/O)' },
]

function ExamplesDropdown() {
  const loadFromExample = useSimulator((s) => s.loadFromExample)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          open
            ? 'bg-surface-3 text-ink-1'
            : 'bg-surface-2 text-ink-1 hover:bg-surface-3',
        )}
      >
        Examples
        <span aria-hidden="true" className="text-[10px] text-ink-3">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Load example program"
          className="absolute left-0 top-full z-40 mt-1 min-w-[18rem] rounded-md border border-divider bg-surface-elev py-1 shadow-lg"
        >
          {EXAMPLES.map((example) => (
            <button
              key={example.id}
              role="menuitem"
              type="button"
              onClick={() => {
                loadFromExample(example.id)
                setOpen(false)
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-2 hover:bg-surface-3 hover:text-ink-1 focus-visible:outline-none focus-visible:bg-surface-3"
            >
              <div className="font-medium text-ink-1">{example.label}</div>
              <div className="font-mono text-[10px] text-ink-3" style={{ letterSpacing: '0.04em' }}>
                {example.desc}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Disabled-placeholder button used for actions wired in later
// sub-agents (edit ops → SA-4 when Monaco lands, run-loop ops → SA-10).
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

// File-op toolbar button — same visual as Button ghost variant but
// tighter (toolbar density). Used by the file group: New / Open /
// Save / Save All.
function FileOpButton({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string
  title: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-sm px-2 py-1 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        disabled
          ? 'cursor-not-allowed bg-surface-2 text-ink-3'
          : 'bg-surface-2 text-ink-1 hover:bg-surface-3',
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
  const source        = useSimulator((s) => s.source)
  const assemble      = useSimulator((s) => s.assemble)
  const run           = useSimulator((s) => s.run)
  const step          = useSimulator((s) => s.step)
  const reset         = useSimulator((s) => s.reset)
  const pause         = useSimulator((s) => s.pause)
  const runToCursor   = useSimulator((s) => s.runToCursor)
  const backstep      = useSimulator((s) => s.backstep)
  // canBackstep is a getter (not a slice value), so subscribing to
  // status keeps the disabled flag fresh — every step / run / reset
  // changes status and triggers re-render.
  const _statusForBackstep = useSimulator((s) => s.status)
  void _statusForBackstep
  const canBackstep   = useSimulator.getState().canBackstep()
  const newFile       = useSimulator((s) => s.newFile)
  const openFromDisk  = useSimulator((s) => s.openFromDisk)
  const saveActive    = useSimulator((s) => s.saveActive)
  const saveAll       = useSimulator((s) => s.saveAll)
  const files         = useSimulator((s) => s.files)
  const activeFileId  = useSimulator((s) => s.activeFileId)
  const status        = useSimulator((s) => s.status)

  const noSource         = source.length === 0
  const activeFile       = files.find((f) => f.id === activeFileId)
  const canSaveActive    = activeFile !== undefined
  const canSaveAll       = files.some((f) => f.modified && f.handle !== null)
  const canPause         = status === 'running'

  return (
    <div
      role="toolbar"
      aria-label="Primary toolbar"
      className="flex h-11 items-center gap-1 overflow-x-auto border-b border-divider bg-surface-1 px-3"
    >
      {/* File ops — wired to the file slice (SA-2 commit 2). */}
      <div className="flex items-center gap-1" aria-label="File operations">
        <FileOpButton label="New"      title="New file (Ctrl+N — keybinding wires in SA-14)"        onClick={newFile} />
        <FileOpButton label="Open"     title="Open file (Ctrl+O — keybinding wires in SA-14)"       onClick={() => { void openFromDisk() }} />
        <FileOpButton label="Save"     title="Save active file (Ctrl+S — keybinding wires in SA-14)" onClick={() => { void saveActive() }}    disabled={!canSaveActive} />
        <FileOpButton label="Save All" title="Save every modified file with a stored handle"         onClick={() => { void saveAll() }}        disabled={!canSaveAll} />
      </div>

      <Divider />

      {/* Examples dropdown — opens one of the 5 bundled .asm files
         as a new tab via loadFromExample. SA-3 will wire the resulting
         tab into the multi-file TabStrip so the user sees it appear. */}
      <ExamplesDropdown />

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
        <Button
          variant="ghost"
          disabled={!canPause}
          aria-disabled={!canPause}
          onClick={pause}
          title="Pause (F6 — keybinding wires in SA-14)"
          className="px-2 py-1 text-xs"
        >
          Pause
        </Button>
        <Button
          variant="ghost"
          disabled={noSource}
          aria-disabled={noSource}
          onClick={step}
          className="px-2 py-1 text-xs"
        >
          Step
        </Button>
        <Button
          variant="ghost"
          disabled={!canBackstep || (status !== 'paused' && status !== 'ready' && status !== 'halted')}
          aria-disabled={!canBackstep || (status !== 'paused' && status !== 'ready' && status !== 'halted')}
          onClick={backstep}
          title="Step backward — restores the prior register/memory snapshot (Shift+F7 — keybinding wires in SA-14)"
          className="px-2 py-1 text-xs"
        >
          Backstep
        </Button>
        <Button
          variant="ghost"
          disabled={noSource || (status !== 'ready' && status !== 'paused')}
          aria-disabled={noSource || (status !== 'ready' && status !== 'paused')}
          onClick={() => {
            const line = getEditorCursor()
            if (typeof line === 'number') runToCursor(line)
          }}
          title="Run until the editor cursor's line (F8 — keybinding wires in SA-14)"
          className="px-2 py-1 text-xs"
        >
          → Cursor
        </Button>
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

      {/* Speed slider — wired to runSpeed (SA-10). */}
      <SpeedSlider />

      {/* Right side: spacer pushes StatusPill to the far edge. */}
      <span className="flex-1" aria-hidden="true" />

      <StatusPill />
    </div>
  )
}
