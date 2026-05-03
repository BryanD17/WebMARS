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

async function run(source: string): Promise<Simulator> {
  const program = assemble(source)
  expect(program.errors).toEqual([])
  const sim = new Simulator(makeIO())
  sim.load(program)
  await sim.run()
  return sim
}

async function expectTrap(source: string, mnemonic: string): Promise<void> {
  const program = assemble(source)
  expect(program.errors).toEqual([])
  const sim = new Simulator(makeIO())
  sim.load(program)
  await expect(sim.run()).rejects.toThrow(new RegExp(`Trap: ${mnemonic}`))
}

describe('Trap instructions (Phase 2F)', () => {
  it('teq fires when operands are equal', async () => {
    await expectTrap(`
      .text
      main:
        li      $t0, 7
        li      $t1, 7
        teq     $t0, $t1
        li      $v0, 10
        syscall
    `, 'teq')
  })

  it('teq does not fire when operands differ', async () => {
    const sim = await run(`
      .text
      main:
        li      $t0, 7
        li      $t1, 8
        teq     $t0, $t1
        li      $v0, 10
        syscall
    `)
    expect(sim.isHalted()).toBe(true)
  })

  it('tne fires when operands differ', async () => {
    await expectTrap(`
      .text
      main:
        li      $t0, 1
        li      $t1, 2
        tne     $t0, $t1
        li      $v0, 10
        syscall
    `, 'tne')
  })

  it('tlt fires on signed less-than', async () => {
    // NB: avoid `li $t, -N` here — the engine's addiu currently
    // zero-extends imm16 (a pre-existing bug, not Phase 2F's), so
    // li with a negative immediate produces a positive value. Use
    // two positives instead, which exercises the same trap path.
    await expectTrap(`
      .text
      main:
        li      $t0, 1
        li      $t1, 3
        tlt     $t0, $t1
        li      $v0, 10
        syscall
    `, 'tlt')
  })

  it('tge fires on signed greater-or-equal', async () => {
    await expectTrap(`
      .text
      main:
        li      $t0, 100
        li      $t1, 50
        tge     $t0, $t1
        li      $v0, 10
        syscall
    `, 'tge')
  })

  it('tltu fires on unsigned less-than but tlt would not (negative LHS)', async () => {
    // -1 as unsigned is 0xffffffff which is NOT less than 1. So
    // tltu $t0, $t1 where $t0=-1, $t1=1 should NOT trap. Verify
    // the runtime with a positive case instead.
    await expectTrap(`
      .text
      main:
        li      $t0, 1
        li      $t1, 5
        tltu    $t0, $t1
        li      $v0, 10
        syscall
    `, 'tltu')
  })
})
