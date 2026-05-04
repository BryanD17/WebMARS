import { describe, it, expect } from 'vitest'
import { assemble } from '../core/instructions'
import { Simulator } from '../core/simulator'
import type { SyscallIO } from '../core/syscalls'

// Phase 3 SA-2 — pseudo-instruction expansion. Each test assembles a
// tiny program that uses one new pseudo-op and checks the runtime
// outcome (via $v0 or printed output) rather than the encoded bits,
// so a regression in the assembler OR the underlying real
// instruction surfaces here.

function makeIO(printed: string[]): SyscallIO {
  return {
    print: (s) => { printed.push(s) },
    readInt: () => Promise.resolve(0),
    readString: () => Promise.resolve(''),
    exit: () => {},
  }
}

async function runAndPrintV0(source: string): Promise<string> {
  const program = assemble(source)
  expect(program.errors).toEqual([])
  const printed: string[] = []
  const sim = new Simulator(makeIO(printed))
  sim.load(program)
  await sim.run()
  return printed.join('')
}

describe('Pseudo-instructions (Phase 3 SA-2)', () => {
  it('blt branches when $rs < $rt', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 5
        li      $t1, 10
        blt     $t0, $t1, less
        li      $a0, 99
        j       done
      less:
        li      $a0, 42
      done:
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('42')
  })

  it('blt does NOT branch when $rs >= $rt', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 10
        li      $t1, 10
        blt     $t0, $t1, less
        li      $a0, 99
        j       done
      less:
        li      $a0, 42
      done:
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('99')
  })

  it('ble branches when $rs <= $rt (equal case)', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 7
        li      $t1, 7
        ble     $t0, $t1, ok
        li      $a0, 99
        j       done
      ok:
        li      $a0, 7
      done:
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('7')
  })

  it('bgt branches when $rs > $rt', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 100
        li      $t1, 50
        bgt     $t0, $t1, big
        li      $a0, 99
        j       done
      big:
        li      $a0, 1
      done:
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('1')
  })

  it('bge branches when $rs >= $rt (equal case)', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 5
        li      $t1, 5
        bge     $t0, $t1, ok
        li      $a0, 99
        j       done
      ok:
        li      $a0, 5
      done:
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('5')
  })

  it('abs returns the magnitude of a positive value', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 42
        abs     $a0, $t0
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('42')
  })

  it('abs returns the magnitude of a negative value', async () => {
    // -5 is computed via sub from zero so we don't trip the addiu
    // sign-ext interplay; verifies the abs expansion against a
    // real negative.
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 5
        sub     $t0, $zero, $t0
        abs     $a0, $t0
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('5')
  })

  it('sge returns 1 when $rs >= $rt and 0 otherwise', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 10
        li      $t1, 5
        sge     $a0, $t0, $t1
        li      $v0, 1
        syscall
        li      $a0, 32
        li      $v0, 11
        syscall
        li      $t0, 5
        li      $t1, 10
        sge     $a0, $t0, $t1
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('1 0')
  })

  it('sgt returns 1 when $rs > $rt and 0 on equality', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 10
        li      $t1, 5
        sgt     $a0, $t0, $t1
        li      $v0, 1
        syscall
        li      $a0, 32
        li      $v0, 11
        syscall
        li      $t0, 5
        li      $t1, 5
        sgt     $a0, $t0, $t1
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('1 0')
  })

  it('neg negates a positive into a negative', async () => {
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 7
        neg     $a0, $t0
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('-7')
  })

  it('not bitwise-inverts all 32 bits', async () => {
    // not 0 → 0xffffffff which prints as -1 signed.
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 0
        not     $a0, $t0
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('-1')
  })

  it('.globl directive is a no-op (no error, label resolves)', async () => {
    const out = await runAndPrintV0(`
      .globl main
      .text
      main:
        li      $a0, 123
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('123')
  })

  it('labels following a multi-expansion pseudo-op resolve correctly', async () => {
    // blt expands to 2 instructions. If the first pass mis-counted
    // the size, "tgt" below would point at the wrong address.
    const out = await runAndPrintV0(`
      .text
      main:
        li      $t0, 1
        li      $t1, 2
        blt     $t0, $t1, tgt
        li      $a0, 99
        j       done
      tgt:
        li      $a0, 7
      done:
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('7')
  })
})
