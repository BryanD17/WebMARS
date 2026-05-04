import { describe, it, expect } from 'vitest'
import { assemble } from '../core/instructions'
import { Simulator } from '../core/simulator'
import type { SyscallIO } from '../core/syscalls'

// Phase 3 SA-1 regression: the engine's syscall-4 path must hand the
// FULL string (no leading-byte drop) to io.print. The user-visible
// "hat is your age?" bug was a render-timing issue in the React tree,
// fixed by SA-1 in the store + BottomPanel; this test pins the engine
// half so a future regression in the byte loop or io plumbing fails
// here loudly instead of only in the browser.
//
// The vitest config runs in a node environment, so we can't mount the
// React tree here. UI verification happens manually per SA-1.

function makeIO(captured: string[]): SyscallIO {
  return {
    print: (s) => { captured.push(s) },
    readInt: () => Promise.resolve(0),
    readString: () => Promise.resolve(''),
    exit: () => {},
  }
}

async function runAndCapture(source: string): Promise<string> {
  const program = assemble(source)
  expect(program.errors).toEqual([])
  const captured: string[] = []
  const sim = new Simulator(makeIO(captured))
  sim.load(program)
  await sim.run()
  return captured.join('')
}

describe('Console first-byte (Phase 3 SA-1)', () => {
  it('print_string emits the full string with no leading-byte drop', async () => {
    const out = await runAndCapture(`
      .data
      msg:    .asciiz "What is your age?\\n"
      .text
      main:
        la      $a0, msg
        li      $v0, 4
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('What is your age?\n')
  })

  it('multiple consecutive prints concatenate without character loss', async () => {
    const out = await runAndCapture(`
      .data
      a:      .asciiz "What"
      b:      .asciiz " is your"
      c:      .asciiz " age?\\n"
      .text
      main:
        la      $a0, a
        li      $v0, 4
        syscall
        la      $a0, b
        li      $v0, 4
        syscall
        la      $a0, c
        li      $v0, 4
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('What is your age?\n')
  })

  it('print_int leading character is preserved as well', async () => {
    const out = await runAndCapture(`
      .text
      main:
        li      $a0, 9999
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('9999')
  })
})
