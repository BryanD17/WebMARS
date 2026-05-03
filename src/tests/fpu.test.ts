import { describe, it, expect } from 'vitest'
import { assemble } from '../core/instructions'
import { Simulator } from '../core/simulator'
import type { SyscallIO } from '../core/syscalls'
import { bitsToFloat } from '../core/registers'

function makeIO(printed: string[]): SyscallIO {
  return {
    print: (s) => { printed.push(s) },
    readInt: () => Promise.resolve(0),
    readString: () => Promise.resolve(''),
    exit: () => {},
  }
}

async function run(source: string): Promise<{ sim: Simulator; printed: string[] }> {
  const program = assemble(source)
  expect(program.errors).toEqual([])
  const printed: string[] = []
  const sim = new Simulator(makeIO(printed))
  sim.load(program)
  await sim.run()
  return { sim, printed }
}

describe('FPU — single-precision arithmetic', () => {
  it('add.s sums two integer-converted operands', async () => {
    const { sim } = await run(`
      .text
      main:
        li      $t0, 3
        mtc1    $t0, $f0
        cvt.s.w $f0, $f0
        li      $t0, 4
        mtc1    $t0, $f1
        cvt.s.w $f1, $f1
        add.s   $f2, $f0, $f1
        li      $v0, 10
        syscall
    `)
    const { fpRegisters } = sim.getFpuState()
    expect(bitsToFloat(fpRegisters[2] ?? 0)).toBeCloseTo(7.0, 5)
  })

  it('mul.s + sqrt.s + cvt.w.s round-trip with print', async () => {
    const { printed } = await run(`
      .text
      main:
        li      $t0, 3
        mtc1    $t0, $f0
        cvt.s.w $f0, $f0
        li      $t0, 4
        mtc1    $t0, $f1
        cvt.s.w $f1, $f1
        mul.s   $f2, $f0, $f0
        mul.s   $f3, $f1, $f1
        add.s   $f4, $f2, $f3
        sqrt.s  $f5, $f4
        cvt.w.s $f6, $f5
        mfc1    $a0, $f6
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(printed.join('')).toBe('5')
  })

  it('c.lt.s + bc1t branches when condition holds', async () => {
    const { sim } = await run(`
      .text
      main:
        li      $t0, 1
        mtc1    $t0, $f0
        cvt.s.w $f0, $f0
        li      $t0, 2
        mtc1    $t0, $f1
        cvt.s.w $f1, $f1
        c.lt.s  $f0, $f1     # 1.0 < 2.0 → cc[0] = true
        bc1t    taken
        li      $v0, 99       # should NOT execute
        j       end
      taken:
        li      $v0, 42
      end:
        li      $v0, 10
        syscall
    `)
    expect(sim.getFpuState().condFlag).toBe(true)
  })

  it('lwc1 / swc1 round-trip a float through memory', async () => {
    const { sim } = await run(`
      .data
      slot:   .word 0
      .text
      main:
        li      $t0, 7
        mtc1    $t0, $f0
        cvt.s.w $f0, $f0      # $f0 = 7.0
        la      $t1, slot
        swc1    $f0, 0($t1)
        lwc1    $f4, 0($t1)
        li      $v0, 10
        syscall
    `)
    const { fpRegisters } = sim.getFpuState()
    expect(bitsToFloat(fpRegisters[4] ?? 0)).toBeCloseTo(7.0, 5)
  })
})
