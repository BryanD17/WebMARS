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

async function run(source: string, delayed: boolean): Promise<{ sim: Simulator; printed: string[] }> {
  const program = assemble(source)
  expect(program.errors).toEqual([])
  const printed: string[] = []
  const sim = new Simulator(makeIO(printed))
  sim.load(program)
  sim.setDelayedBranching(delayed)
  await sim.run()
  return { sim, printed }
}

describe('Delayed branching (Phase 2C)', () => {
  // The delay slot instruction (addi $t0, $t0, 100) executes even
  // when the branch is TAKEN — that's the whole point of delay
  // slots. Without delayed branching, the addi is skipped because
  // the branch jumps over it.
  const source = `
    .text
    main:
      li      $t0, 0
      li      $t1, 1
      li      $t2, 1
      beq     $t1, $t2, target    # always taken
      addi    $t0, $t0, 100       # delay slot
      addi    $t0, $t0, 999       # never executed in either mode
    target:
      add     $a0, $t0, $zero
      li      $v0, 1
      syscall
      li      $v0, 10
      syscall
  `

  it('skips the post-branch instruction when delayed branching is OFF', async () => {
    const { printed } = await run(source, false)
    expect(printed.join('')).toBe('0')
  })

  it('runs the delay slot when delayed branching is ON', async () => {
    const { printed } = await run(source, true)
    expect(printed.join('')).toBe('100')
  })

  it('jal saves PC+8 (past the delay slot) when delayed branching is ON', async () => {
    // With delayed branching, $ra after jal should point past the
    // delay slot so jr $ra returns there. Without it, $ra points to
    // the immediately-following instruction.
    const sourceJal = `
      .text
      main:
        jal     callee
        addi    $t0, $t0, 7   # delay slot
        addi    $t1, $t0, 0   # return target
        add     $a0, $t1, $zero
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
      callee:
        jr      $ra
        nop                   # delay slot for the return
    `
    const { printed } = await run(sourceJal, true)
    // Delay slot executes once (sets $t0 = 7), then control returns
    // to the instruction past the delay slot, which copies $t0 → $t1
    // and prints it.
    expect(printed.join('')).toBe('7')
  })
})
