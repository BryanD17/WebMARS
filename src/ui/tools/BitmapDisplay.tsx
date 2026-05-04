import { useEffect, useRef, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from '../cn.ts'

// Phase 3 SA-12: Bitmap Display tool. Treats a region of memory as a
// 2D pixel grid; each word becomes one RGB pixel
// (word = 0x00RRGGBB). Repaints from the simulator's memory on
// every step (subscription is via instructionsExecuted).
//
// Configurable: cell size (1/2/4/8/16/32 px), grid dimensions
// (32 / 64 / 128 / 256 cells per side), base address, and a
// connect/disconnect toggle so the canvas doesn't burn CPU when the
// tool is open but the user isn't interested.

const CELL_SIZE_OPTIONS = [1, 2, 4, 8, 16, 32] as const
const DIMENSION_OPTIONS = [32, 64, 128, 256] as const

const DEFAULT_BASE = 0x10010000

export function BitmapDisplay() {
  const open       = useSimulator((s) => s.toolsDialog === 'bitmap')
  const closeTool  = useSimulator((s) => s.closeTool)
  // Subscribing to instructionsExecuted triggers a re-render after
  // each engine step; that's the cue to re-paint the canvas.
  const stepCount  = useSimulator((s) => s.instructionsExecuted)
  const dumpMemory = useSimulator((s) => s.dumpMemory)

  const [cellSize, setCellSize]   = useState<number>(8)
  const [dimension, setDimension] = useState<number>(64)
  const [base, setBase]           = useState<number>(DEFAULT_BASE)
  const [baseInput, setBaseInput] = useState<string>('0x' + DEFAULT_BASE.toString(16))
  const [connected, setConnected] = useState<boolean>(true)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeTool()
    }
    window.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, closeTool])

  // Paint pass: read dimension*dimension words from memory starting
  // at base and write each one as a single RGB pixel into a
  // ImageData buffer, then putImageData onto the canvas. Skip if
  // disconnected so the user can pause repaints during heavy debug.
  useEffect(() => {
    if (!open || !connected) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const wordCount = dimension * dimension
    const words = dumpMemory(base, wordCount)
    if (words.length === 0) {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    // Build an off-screen ImageData at the cell-grid resolution and
    // upscale to canvas via imageSmoothingEnabled=false.
    const offscreen = ctx.createImageData(dimension, dimension)
    const data = offscreen.data
    for (let i = 0; i < wordCount; i++) {
      const w = words[i]?.word ?? 0
      const off = i * 4
      data[off + 0] = (w >>> 16) & 0xff
      data[off + 1] = (w >>> 8)  & 0xff
      data[off + 2] = w          & 0xff
      data[off + 3] = 0xff
    }

    // Render path: write to a temp canvas at native resolution, then
    // drawImage to scale up with nearest-neighbor sampling so each
    // word is a crisp cellSize×cellSize block on the visible canvas.
    const temp = document.createElement('canvas')
    temp.width = dimension
    temp.height = dimension
    const tempCtx = temp.getContext('2d')
    if (!tempCtx) return
    tempCtx.putImageData(offscreen, 0, 0)

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(temp, 0, 0, canvas.width, canvas.height)
  }, [open, connected, stepCount, base, dimension, cellSize, dumpMemory])

  if (!open) return null

  const canvasPx = dimension * cellSize

  function commitBaseInput(): void {
    const trimmed = baseInput.trim()
    let n: number
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      n = parseInt(trimmed, 16)
    } else if (trimmed.startsWith('0b') || trimmed.startsWith('0B')) {
      n = parseInt(trimmed.slice(2), 2)
    } else {
      n = parseInt(trimmed, 10)
    }
    if (Number.isFinite(n)) {
      const aligned = (n & ~0x3) >>> 0
      setBase(aligned)
      setBaseInput('0x' + aligned.toString(16))
    } else {
      setBaseInput('0x' + base.toString(16))
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeTool() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Bitmap Display"
        tabIndex={-1}
        className={cn(
          'flex max-h-[90vh] flex-col overflow-hidden rounded-lg border border-divider bg-surface-1 shadow-xl',
          'focus-visible:outline-none',
        )}
        style={{ width: 'min(90vw, 56rem)' }}
      >
        <header className="flex h-10 flex-none items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-2 text-sm text-ink-1">
            <span aria-hidden="true">▦</span>
            Bitmap Display
          </div>
          <button
            type="button"
            onClick={closeTool}
            aria-label="Close"
            title="Close (Esc)"
            className="rounded-sm px-2 py-0.5 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            ×
          </button>
        </header>

        {/* Settings strip */}
        <div className="grid flex-none grid-cols-4 gap-2 border-b border-divider px-4 py-2 text-[11px]">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Cell size</span>
            <select
              value={cellSize}
              onChange={(e) => setCellSize(Number(e.target.value))}
              className="rounded-sm border border-divider bg-surface-2 px-2 py-1 font-mono text-ink-1 focus-visible:outline-none focus-visible:border-accent"
            >
              {CELL_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}px</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Grid</span>
            <select
              value={dimension}
              onChange={(e) => setDimension(Number(e.target.value))}
              className="rounded-sm border border-divider bg-surface-2 px-2 py-1 font-mono text-ink-1 focus-visible:outline-none focus-visible:border-accent"
            >
              {DIMENSION_OPTIONS.map((n) => <option key={n} value={n}>{n}×{n}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Base address</span>
            <input
              type="text"
              value={baseInput}
              onChange={(e) => setBaseInput(e.target.value)}
              onBlur={commitBaseInput}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitBaseInput() } }}
              className="rounded-sm border border-divider bg-surface-2 px-2 py-1 font-mono text-ink-1 focus-visible:outline-none focus-visible:border-accent"
            />
          </label>
          <label className="flex flex-col justify-end gap-1">
            <button
              type="button"
              onClick={() => setConnected((c) => !c)}
              className={cn(
                'rounded-sm border px-2 py-1 text-xs transition-colors',
                connected
                  ? 'border-ok bg-ok/10 text-ok'
                  : 'border-divider bg-surface-2 text-ink-2 hover:bg-surface-3',
              )}
            >
              {connected ? '● Connected' : '○ Disconnected'}
            </button>
          </label>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-surface-0 p-4">
          <canvas
            ref={canvasRef}
            width={canvasPx}
            height={canvasPx}
            className="block border border-divider"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        <footer
          className="flex flex-none items-center justify-between border-t border-divider px-4 py-1 font-mono text-[10px] text-ink-3"
          style={{ letterSpacing: '0.04em' }}
        >
          <span>Word format: 0x00RRGGBB · {dimension * dimension} pixels · {(dimension * dimension * 4)} bytes from {('0x' + base.toString(16))}</span>
          <span>step #{stepCount}</span>
        </footer>
      </div>
    </div>
  )
}
