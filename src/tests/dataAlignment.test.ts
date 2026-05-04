import { describe, it, expect } from 'vitest'
import { assemble } from '../core/instructions'
import { Simulator } from '../core/simulator'
import type { SyscallIO } from '../core/syscalls'

// Phase 3 follow-up: real MARS auto-aligns .word and .half so labels
// declared after a .byte / .asciiz still land on natural boundaries.
// These tests pin that behavior so a regression in the assembler's
// alignment surfaces here instead of as an "Unaligned word read"
// runtime error.

function makeIO(printed: string[]): SyscallIO {
  return {
    print: (s) => { printed.push(s) },
    readInt: () => Promise.resolve(0),
    readString: () => Promise.resolve(''),
    exit: () => {},
  }
}

async function runAndPrint(source: string): Promise<string> {
  const program = assemble(source)
  expect(program.errors).toEqual([])
  const printed: string[] = []
  const sim = new Simulator(makeIO(printed))
  sim.load(program)
  await sim.run()
  return printed.join('')
}

describe('Data alignment (Phase 3 follow-up)', () => {
  it('.word lands on a 4-byte boundary even after a .byte', async () => {
    // myChar lives at 0x10010005 (single byte). Without auto-align
    // the .word that follows would land at 0x10010006 (unaligned).
    // This program loads and prints n1 — if alignment is broken,
    // the lw throws and the test fails with the assembler error.
    const out = await runAndPrint(`
      .data
      myChar: .byte 'j'
      n1:     .word 42
      .text
      main:
        la      $t0, n1
        lw      $a0, 0($t0)
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('42')
  })

  it('multiple .word entries each land on 4-byte boundaries', async () => {
    const out = await runAndPrint(`
      .data
      pad:    .byte 'x'
      a:      .word 100
      b:      .word 200
      .text
      main:
        la      $t0, a
        lw      $a0, 0($t0)
        li      $v0, 1
        syscall
        la      $t0, b
        lw      $a0, 0($t0)
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('100200')
  })

  it('.half lands on a 2-byte boundary even after a .byte', async () => {
    const out = await runAndPrint(`
      .data
      one_byte: .byte 1
      h:        .half 9999
      .text
      main:
        la      $t0, h
        lh      $a0, 0($t0)
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('9999')
  })

  it("char-literal .byte 'X' emits the codepoint", async () => {
    const out = await runAndPrint(`
      .data
      ch:     .byte 'A'
      .text
      main:
        la      $t0, ch
        lb      $a0, 0($t0)
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('65')   // 'A' = 65
  })

  it('common escapes inside char literals decode correctly', async () => {
    const out = await runAndPrint(`
      .data
      nl:     .byte '\\n'
      .text
      main:
        la      $t0, nl
        lb      $a0, 0($t0)
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `)
    expect(out).toBe('10')   // \\n = 10
  })

  it('.align N forces alignment to 2^N', async () => {
    // Without .align 3, n1 would be at offset 1 (unaligned).
    // With .align 3, n1 lands at offset 8 (aligned to 8 bytes).
    const program = assemble(`
      .data
      pad:    .byte 1
      .align  3
      n1:     .word 1
    `)
    expect(program.errors).toEqual([])
    const n1Addr = program.labels.get('n1')
    expect(n1Addr).toBeDefined()
    expect((n1Addr ?? 0) & 7).toBe(0)
  })
})
