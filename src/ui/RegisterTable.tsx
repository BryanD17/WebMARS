import { useSimulator, type NumberBase } from '@/hooks/useSimulator.ts'
import type { RegisterSnapshot } from '@/hooks/types.ts'
import { cn } from './cn.ts'

interface Group {
  label: string
  registers: ReadonlyArray<string>
}

// Grouped by ABI role rather than numeric register index. Students
// reason about MIPS registers in these groups; PC/HI/LO live in a
// separate "Special" group below a hairline.
const GPR_GROUPS: ReadonlyArray<Group> = [
  { label: 'Constant',      registers: ['$zero'] },
  { label: 'Assembler',     registers: ['$at'] },
  { label: 'Return values', registers: ['$v0', '$v1'] },
  { label: 'Arguments',     registers: ['$a0', '$a1', '$a2', '$a3'] },
  {
    label: 'Temporaries',
    registers: [
      '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7', '$t8', '$t9',
    ],
  },
  {
    label: 'Saved',
    registers: ['$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7'],
  },
  { label: 'Kernel',   registers: ['$k0', '$k1'] },
  { label: 'Pointers', registers: ['$gp', '$sp', '$fp', '$ra'] },
]

const SPECIAL_GROUP: Group = {
  label: 'Special',
  registers: ['PC', 'HI', 'LO'],
}

// Format an int32 value in the requested base.
//   hex → 0x00000000 (unsigned, padded to 8 nibbles, lowercase)
//   dec → signed decimal (as int32 — matches how MIPS programs reason)
//   bin → 0b…0 (unsigned, padded to 32 bits)
function formatValue(value: number, base: NumberBase): string {
  switch (base) {
    case 'hex': return '0x' + (value >>> 0).toString(16).padStart(8, '0')
    case 'dec': return ((value | 0)).toString(10)
    case 'bin': return '0b' + (value >>> 0).toString(2).padStart(32, '0')
  }
}

function valueAndChangedFor(
  registers: RegisterSnapshot,
  name: string,
): { value: number; changed: boolean } {
  if (name === 'PC') {
    return { value: registers.pc, changed: registers.changed.has('pc') }
  }
  if (name === 'HI') {
    return { value: registers.hi, changed: registers.changed.has('hi') }
  }
  if (name === 'LO') {
    return { value: registers.lo, changed: registers.changed.has('lo') }
  }
  return {
    value: registers.gpr[name] ?? 0,
    changed: registers.changed.has(name),
  }
}

interface RowProps {
  index: number
  name: string
  value: number
  changed: boolean
  base: NumberBase
}

function RegisterRow({ index, name, value, changed, base }: RowProps) {
  const stripe = index % 2 === 0 ? 'bg-surface-2' : 'bg-transparent'
  const valueColor = value === 0 && !changed ? 'text-ink-3' : 'text-ink-1'
  return (
    <div className={cn('grid items-center', stripe)} style={{ gridTemplateColumns: '60px 1fr' }}>
      <div className="px-3 py-1 text-sm text-ink-2">{name}</div>
      <div
        className={cn(
          'px-3 py-1 text-right text-sm tabular-nums',
          // bin values are 34 chars wide — let them overflow with
          // horizontal scroll on the row's value cell rather than
          // wrapping or clipping.
          base === 'bin' ? 'overflow-x-auto whitespace-nowrap' : '',
          valueColor,
        )}
      >
        {formatValue(value, base)}
      </div>
    </div>
  )
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase text-ink-3"
      style={{ letterSpacing: '0.08em' }}
    >
      {label}
    </div>
  )
}

const BASES: ReadonlyArray<{ id: NumberBase; label: string }> = [
  { id: 'hex', label: 'HEX' },
  { id: 'dec', label: 'DEC' },
  { id: 'bin', label: 'BIN' },
]

function BaseToggle() {
  const numberBase    = useSimulator((s) => s.numberBase)
  const setNumberBase = useSimulator((s) => s.setNumberBase)

  return (
    <div
      role="group"
      aria-label="Number base"
      className="inline-flex overflow-hidden rounded-md border border-divider"
    >
      {BASES.map((opt, i) => {
        const active = numberBase === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => setNumberBase(opt.id)}
            className={cn(
              'px-3 py-1 font-mono text-xs uppercase transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
              i > 0 && 'border-l border-divider',
              active
                ? 'bg-surface-2 text-ink-1'
                : 'text-ink-3 hover:bg-surface-2 hover:text-ink-2',
            )}
            style={{ letterSpacing: '0.06em' }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function RegisterTable() {
  const registers  = useSimulator((s) => s.registers)
  const numberBase = useSimulator((s) => s.numberBase)

  // Pre-compute the running row index for each group so stripes stay
  // continuous across group boundaries.
  const gprGroupsWithOffsets = GPR_GROUPS.reduce<
    Array<Group & { offset: number }>
  >((acc, group) => {
    const prev = acc[acc.length - 1]
    const offset = prev ? prev.offset + prev.registers.length : 0
    acc.push({ ...group, offset })
    return acc
  }, [])
  const lastGpr = gprGroupsWithOffsets[gprGroupsWithOffsets.length - 1]
  const specialGroupOffset = lastGpr
    ? lastGpr.offset + lastGpr.registers.length
    : 0

  return (
    <div className="space-y-3">
      <BaseToggle />

      <div className="overflow-hidden rounded-md border border-divider bg-surface-1 font-mono">
        {gprGroupsWithOffsets.map((group, gi) => (
          <div
            key={group.label}
            className={cn(gi !== gprGroupsWithOffsets.length - 1 && 'mb-1')}
          >
            <GroupLabel label={group.label} />
            {group.registers.map((name, ri) => {
              const { value, changed } = valueAndChangedFor(registers, name)
              return (
                <RegisterRow
                  key={name}
                  index={group.offset + ri}
                  name={name}
                  value={value}
                  changed={changed}
                  base={numberBase}
                />
              )
            })}
          </div>
        ))}

        <div className="mt-1 border-t border-divider pt-1">
          <GroupLabel label={SPECIAL_GROUP.label} />
          {SPECIAL_GROUP.registers.map((name, ri) => {
            const { value, changed } = valueAndChangedFor(registers, name)
            return (
              <RegisterRow
                key={name}
                index={specialGroupOffset + ri}
                name={name}
                value={value}
                changed={changed}
                base={numberBase}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
