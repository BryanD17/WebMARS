import { useEffect, useRef, useState } from 'react'
import { cn } from './cn.ts'

// Phase 3 SA-5: drag-to-resize handle. Used between Shell regions
// (LeftRail+Center, Center+RightPanel, Source+BottomPanel). Renders
// as a 4px-thick invisible strip that highlights to --accent on
// hover. Pointer events drive the resize; arrow keys nudge the size
// for keyboard-only users.
//
// The handle does NOT own the size state. The parent component
// passes in the current size and an onResize callback; this keeps
// the persistence layer (the Zustand layoutSizes slice) ignorant of
// pointer events and makes the handle reusable for future panels.

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical'
  size: number                         // current size in pixels
  min: number
  max: number
  defaultSize: number                  // for the Home-key reset
  onResize: (next: number) => void
  ariaLabel: string
  // When the resizable panel sits AFTER the handle (right of a
  // horizontal handle, below a vertical one), dragging the handle
  // in the natural axis SHRINKS the panel. Setting invert=true
  // flips the delta so the size goes the right way.
  invert?: boolean
}

const ARROW_NUDGE       = 8
const SHIFT_ARROW_NUDGE = 32

export function ResizeHandle({
  direction, size, min, max, defaultSize, onResize, ariaLabel, invert = false,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  // Pointer position is measured in screen coordinates. Capturing
  // the start values lets us compute size deltas without coupling
  // to layout reads on every move event.
  const startRef = useRef<{ pointer: number; size: number } | null>(null)

  function clamp(n: number): number {
    return Math.max(min, Math.min(max, Math.round(n)))
  }

  // Pointer-down: capture start values and begin tracking. Skip if
  // the gesture didn't originate from primary button.
  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    startRef.current = {
      pointer: direction === 'horizontal' ? event.clientX : event.clientY,
      size,
    }
    setDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const start = startRef.current
    if (!start) return
    const current = direction === 'horizontal' ? event.clientX : event.clientY
    const sign = invert ? -1 : 1
    onResize(clamp(start.size + sign * (current - start.pointer)))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>): void {
    event.currentTarget.releasePointerCapture(event.pointerId)
    startRef.current = null
    setDragging(false)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const step = event.shiftKey ? SHIFT_ARROW_NUDGE : ARROW_NUDGE
    if (direction === 'horizontal') {
      if (event.key === 'ArrowLeft')  { event.preventDefault(); onResize(clamp(size - step)) }
      if (event.key === 'ArrowRight') { event.preventDefault(); onResize(clamp(size + step)) }
    } else {
      if (event.key === 'ArrowUp')   { event.preventDefault(); onResize(clamp(size - step)) }
      if (event.key === 'ArrowDown') { event.preventDefault(); onResize(clamp(size + step)) }
    }
    if (event.key === 'Home') { event.preventDefault(); onResize(clamp(defaultSize)) }
  }

  // Set the body cursor while dragging so it stays consistent even
  // when the pointer leaves the handle. Restore on unmount or
  // dragging-end via the cleanup.
  useEffect(() => {
    if (!dragging) return
    const prev = document.body.style.cursor
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
    return () => { document.body.style.cursor = prev }
  }, [dragging, direction])

  const isHorizontal = direction === 'horizontal'

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={size}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex-none touch-none transition-colors',
        'focus-visible:outline-none focus-visible:bg-accent/40',
        isHorizontal
          ? 'w-1 cursor-col-resize hover:bg-accent/60'
          : 'h-1 cursor-row-resize hover:bg-accent/60',
        dragging && 'bg-accent',
      )}
    >
      {/* Three-dot grip indicator, fades in on hover/focus. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute opacity-0 transition-opacity',
          'group-hover:opacity-60 group-focus-visible:opacity-80',
          dragging && 'opacity-80',
          isHorizontal
            ? 'left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-0.5'
            : 'left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-0.5',
        )}
      >
        <span className="block size-0.5 rounded-pill bg-ink-2" />
        <span className="block size-0.5 rounded-pill bg-ink-2" />
        <span className="block size-0.5 rounded-pill bg-ink-2" />
      </span>
    </div>
  )
}
