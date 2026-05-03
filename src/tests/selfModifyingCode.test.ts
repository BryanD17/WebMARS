import { describe, it, expect } from 'vitest'
import { assemble } from '../core/instructions'
import { Simulator } from '../core/simulator'
import type { SyscallIO } from '../core/syscalls'

function makeIO(): SyscallIO {
  return {
    print: () => {},
    readInt: () => Promise.resolve(0),
    readString: () => Promise.resolve(''),
    exit: () => {},
  }
}

describe('Self-modifying code guard (Phase 2D)', () => {
  // sw $t0, 0($t1) where $t1 = TEXT_BASE — a store into the
  // instruction stream. The default-deny policy throws; flipping
  // the flag lets it succeed.
  const source = `
    .text
    main:
      lui     $t1, 0x0040    # $t1 = 0x00400000 (TEXT_BASE)
      li      $t0, 0x12345678
      sw      $t0, 0($t1)
      li      $v0, 10
      syscall
  `

  it('throws by default when storing to .text', async () => {
    const program = assemble(source)
    expect(program.errors).toEqual([])
    const sim = new Simulator(makeIO())
    sim.load(program)
    await expect(sim.run()).rejects.toThrow(/Self-modifying code/)
  })

  it('succeeds when self-modifying code is allowed', async () => {
    const program = assemble(source)
    expect(program.errors).toEqual([])
    const sim = new Simulator(makeIO())
    sim.load(program)
    sim.setAllowSelfModifyingCode(true)
    await sim.run()
    expect(sim.isHalted()).toBe(true)
  })
})
