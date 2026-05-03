import { describe, it, expect } from 'vitest'
import { assemble } from '../core/instructions'
import { Simulator } from '../core/simulator'
import type { SyscallIO } from '../core/syscalls'

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

describe('addiu / sltiu sign-extension (Phase 2G fix)', () => {
  it('li $t0, -5 produces -5 (addiu sign-extends imm16)', async () => {
    const { printed } = await run(`
      .text
      main:
        li      $t0, -5
        add     $a0, $t0, $zero
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(printed.join('')).toBe('-5')
  })

  it('addiu $t1, $zero, -100 produces -100', async () => {
    const { printed } = await run(`
      .text
      main:
        addiu   $t1, $zero, -100
        add     $a0, $t1, $zero
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(printed.join('')).toBe('-100')
  })

  it('sltiu compares against sign-extended immediate', async () => {
    // sltiu $t0, $t1, -1 → compare $t1 (unsigned) against 0xffffffff.
    // Any value other than 0xffffffff is < 0xffffffff → result 1.
    const { printed } = await run(`
      .text
      main:
        li      $t1, 100
        sltiu   $t0, $t1, -1
        add     $a0, $t0, $zero
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(printed.join('')).toBe('1')
  })
})
