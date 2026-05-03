import { useSimulator, type NumberBase } from '@/hooks/useSimulator.ts'
import { bitsToFloat } from '@/core/registers.ts'
import { cn } from './cn.ts'

// Format a single-precision float — three decimal places when the
// magnitude is small, scientific notation otherwise. NaN / Infinity
// pass through as their JS string forms (consistent with how MARS
// displays them).
function formatFloat(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  if (value === 0) return '0.000'
  const abs = Math.abs(value)
  if (abs >= 1e6 || abs < 1e-3) return value.toExponential(3)
  return value.toFixed(3)
}

function formatBits(bits: number, base: NumberBase): string {
  switch (base) {
    case 'hex': return '0x' + (bits >>> 0).toString(16).padStart(8, '0')
    case 'dec': return ((bits | 0)).toString(10)
    case 'bin': return '0b' + (bits >>> 0).toString(2).padStart(32, '0')
  }
}

export function FpuRegisterTable() {
  const fpRegisters = useSimulator((s) => s.fpRegisters)
  const numberBase  = useSimulator((s) => s.numberBase)

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center justify-between font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <span>32 single-precision registers</span>
        <span className="flex items-center gap-1">
          cc[0]
          <span
            className={cn(
              'rounded-pill px-1.5 py-0.5 font-mono text-[10px]',
              fpRegisters.condFlag
                ? 'bg-ok text-surface-0'
                : 'bg-surface-3 text-ink-2',
            )}
          >
            {fpRegisters.condFlag ? 'true' : 'false'}
          </span>
        </span>
      </div>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr
            className="border-b border-divider font-mono text-[10px] uppercase text-ink-3"
            style={{ letterSpacing: '0.06em' }}
          >
            <th className="px-1 py-1 text-left">Reg</th>
            <th className="px-1 py-1 text-right">Float</th>
            <th className="px-1 py-1 text-right">Bits</th>
          </tr>
        </thead>
        <tbody>
          {fpRegisters.values.map((bits, idx) => {
            const changed = fpRegisters.changed.has(idx)
            const float = bitsToFloat(bits)
            return (
              <tr
                key={idx}
                className={cn(
                  'border-b border-divider/40 last:border-b-0',
                  changed && 'bg-accent/10',
                )}
              >
                <td className="px-1 py-0.5 font-mono text-ink-2">
                  ${`f${idx}`}
                </td>
                <td className="px-1 py-0.5 text-right font-mono tabular-nums text-ink-1">
                  {formatFloat(float)}
                </td>
                <td className="px-1 py-0.5 text-right font-mono tabular-nums text-ink-3">
                  {formatBits(bits, numberBase)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
