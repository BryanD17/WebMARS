import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

// Canonical display order: $zero, $at, $v0/$v1, $a0..$a3, $t0..$t9,
// $s0..$s7, $k0/$k1, $gp, $sp, $fp, $ra. Groups by purpose, not by
// numeric register index ($t8/$t9 are r24/r25 in MIPS, but live here
// next to the rest of the temporaries because that's how students
// reason about them).
const GPR_ORDER = [
  '$zero', '$at',
  '$v0',   '$v1',
  '$a0',   '$a1',   '$a2',   '$a3',
  '$t0',   '$t1',   '$t2',   '$t3',   '$t4',   '$t5',   '$t6',   '$t7',
  '$t8',   '$t9',
  '$s0',   '$s1',   '$s2',   '$s3',   '$s4',   '$s5',   '$s6',   '$s7',
  '$k0',   '$k1',
  '$gp',   '$sp',   '$fp',   '$ra',
] as const

function formatHex(value: number): string {
  // Coerce to unsigned 32-bit so negatives display as 0xFFFFFFFF, not -1.
  return '0x' + (value >>> 0).toString(16).padStart(8, '0')
}

interface RowProps {
  index: number
  name: string
  value: number
  changed: boolean
  topBorder?: boolean
}

function RegisterRow({ index, name, value, changed, topBorder }: RowProps) {
  // Even rows get a subtle --surface-2 stripe over the inspector's
  // --surface-1 chrome; odd rows stay transparent. Matches the
  // addendum's alternation intent (literal spec said even=surface-1,
  // but the inspector parent is already surface-1, so we stripe with
  // the next step up to make the rows visible).
  const stripe = index % 2 === 0 ? 'bg-surface-2' : 'bg-transparent'
  return (
    <tr className={cn(stripe, topBorder && 'border-t border-divider')}>
      <td className="w-[60px] px-3 py-1 text-sm text-ink-2">{name}</td>
      <td
        className={cn(
          'px-3 py-1 text-right text-sm tabular-nums',
          changed ? 'text-ink-1' : 'text-ink-3',
        )}
      >
        {formatHex(value)}
      </td>
    </tr>
  )
}

function BaseToggle() {
  return (
    <div
      role="group"
      aria-label="Number base"
      className="inline-flex overflow-hidden rounded-md border border-divider"
    >
      <button
        type="button"
        aria-pressed="true"
        className="bg-surface-2 px-3 py-1 font-mono text-xs uppercase text-ink-1"
        style={{ letterSpacing: '0.06em' }}
      >
        HEX
      </button>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Decimal view wires in on Day 3"
        className="border-l border-divider px-3 py-1 font-mono text-xs uppercase text-ink-3 disabled:cursor-not-allowed"
        style={{ letterSpacing: '0.06em' }}
      >
        DEC
      </button>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Binary view wires in on Day 3"
        className="border-l border-divider px-3 py-1 font-mono text-xs uppercase text-ink-3 disabled:cursor-not-allowed"
        style={{ letterSpacing: '0.06em' }}
      >
        BIN
      </button>
    </div>
  )
}

export function RegisterTable() {
  const registers = useSimulator((s) => s.registers)

  return (
    <div className="space-y-3">
      <BaseToggle />

      <div className="overflow-hidden rounded-md border border-divider">
        <table className="w-full font-mono">
          <tbody>
            {GPR_ORDER.map((name, i) => (
              <RegisterRow
                key={name}
                index={i}
                name={name}
                value={registers.gpr[name] ?? 0}
                changed={registers.changed.has(name)}
              />
            ))}

            <RegisterRow
              index={GPR_ORDER.length}
              name="PC"
              value={registers.pc}
              changed={registers.changed.has('pc')}
              topBorder
            />
            <RegisterRow
              index={GPR_ORDER.length + 1}
              name="HI"
              value={registers.hi}
              changed={registers.changed.has('hi')}
            />
            <RegisterRow
              index={GPR_ORDER.length + 2}
              name="LO"
              value={registers.lo}
              changed={registers.changed.has('lo')}
            />
          </tbody>
        </table>
      </div>
    </div>
  )
}
