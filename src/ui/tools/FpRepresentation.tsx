import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { bitsToFloat, floatToBits } from '@/core/registers.ts'
import { cn } from '../cn.ts'

// Phase 3 SA-14: IEEE 754 single-precision bit-level editor. Type a
// decimal value and see the 32 bits split into sign / exponent /
// mantissa, or click any bit to flip it and watch the decimal
// update.

function bitsString(bits: number): string {
  return (bits >>> 0).toString(2).padStart(32, '0')
}

function classifyFloat(bits: number): string {
  const u = bits >>> 0
  const sign = u >>> 31
  const exp  = (u >>> 23) & 0xff
  const mant = u & 0x7fffff
  if (exp === 0xff) {
    if (mant === 0) return sign === 1 ? '-Infinity' : '+Infinity'
    return 'NaN'
  }
  if (exp === 0) {
    if (mant === 0) return sign === 1 ? '-Zero' : '+Zero'
    return 'Subnormal'
  }
  return sign === 1 ? 'Negative normal' : 'Positive normal'
}

export function FpRepresentation() {
  const open      = useSimulator((s) => s.toolsDialog === 'fpRepr')
  const closeTool = useSimulator((s) => s.closeTool)

  const [bits, setBits] = useState<number>(floatToBits(3.14))
  const [decimalInput, setDecimalInput] = useState<string>('3.14')
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

  const value = useMemo(() => bitsToFloat(bits), [bits])
  const bitStr = useMemo(() => bitsString(bits), [bits])
  const classification = useMemo(() => classifyFloat(bits), [bits])

  function handleDecimalChange(raw: string): void {
    setDecimalInput(raw)
    const n = Number(raw)
    if (Number.isFinite(n)) setBits(floatToBits(n))
  }

  function flipBit(index: number): void {
    // Bit 0 here is the LEFTMOST bit of bitStr (the sign bit).
    // Convert to mask position.
    const mask = (1 << (31 - index)) >>> 0
    const next = (bits >>> 0) ^ mask
    setBits(next | 0)
    setDecimalInput(String(bitsToFloat(next | 0)))
  }

  if (!open) return null

  // Group the 32 bits into sign (1) | exponent (8) | mantissa (23).
  const bitColors = (i: number): string => {
    if (i === 0)         return 'bg-danger/20 hover:bg-danger/30'
    if (i >= 1 && i <= 8) return 'bg-warn/20 hover:bg-warn/30'
    return 'bg-accent/20 hover:bg-accent/30'
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
        aria-label="IEEE 754 Floating-Point Representation"
        tabIndex={-1}
        className={cn(
          'flex w-[44rem] flex-col overflow-hidden rounded-lg border border-divider bg-surface-1 shadow-xl',
          'focus-visible:outline-none',
        )}
      >
        <header className="flex h-10 flex-none items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-2 text-sm text-ink-1">
            <span aria-hidden="true">π</span>
            IEEE 754 Floating-Point Representation
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

        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Decimal input + readout */}
          <div className="flex items-center gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Decimal value</span>
              <input
                type="text"
                value={decimalInput}
                onChange={(e) => handleDecimalChange(e.target.value)}
                className="rounded-sm border border-divider bg-surface-2 px-3 py-1.5 font-mono text-sm text-ink-1 focus-visible:outline-none focus-visible:border-accent"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Decoded</span>
              <span className="font-mono text-sm text-ink-1 tabular-nums">{value}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Class</span>
              <span className="text-xs text-ink-2">{classification}</span>
            </div>
          </div>

          {/* 32-bit grid */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>
              <span>Bits (click to toggle)</span>
              <span>0x{(bits >>> 0).toString(16).padStart(8, '0')}</span>
            </div>
            <div className="flex gap-px overflow-x-auto">
              {bitStr.split('').map((bit, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => flipBit(i)}
                  className={cn(
                    'flex size-7 flex-none items-center justify-center rounded-sm font-mono text-xs transition-colors',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                    bitColors(i),
                    'text-ink-1',
                  )}
                  title={`Bit ${31 - i}: ${bit}`}
                >
                  {bit}
                </button>
              ))}
            </div>
            {/* Field labels */}
            <div className="flex gap-px font-mono text-[10px] text-ink-3" style={{ letterSpacing: '0.04em' }}>
              <span className="w-7 flex-none text-center">S</span>
              <span className="w-[14rem] flex-none text-center">Exponent (8)</span>
              <span className="flex-1 text-center">Mantissa (23)</span>
            </div>
          </div>

          {/* Decoded fields */}
          <dl className="grid grid-cols-3 gap-3 border-t border-divider pt-3 text-[11px]">
            <div>
              <dt className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Sign</dt>
              <dd className="mt-1 font-mono text-ink-1">{(bits >>> 31) & 1}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Exponent (biased)</dt>
              <dd className="mt-1 font-mono text-ink-1">{(bits >>> 23) & 0xff} <span className="text-ink-3">(unbiased {((bits >>> 23) & 0xff) - 127})</span></dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>Mantissa</dt>
              <dd className="mt-1 font-mono text-ink-1">0x{((bits & 0x7fffff) >>> 0).toString(16).padStart(6, '0')}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
