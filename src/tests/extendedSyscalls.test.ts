import { describe, it, expect } from 'vitest'
import { assemble } from '../core/instructions'
import { Simulator } from '../core/simulator'
import type { SyscallIO, DialogKind } from '../core/syscalls'

interface Trace {
  printed: string[]
  alerts: { message: string; kind: DialogKind }[]
  confirms: string[]
}

function makeIO(trace: Trace, overrides: Partial<SyscallIO> = {}): SyscallIO {
  return {
    print: (s) => { trace.printed.push(s) },
    readInt: () => Promise.resolve(0),
    readString: () => Promise.resolve(''),
    readChar: () => Promise.resolve('A'),
    confirm: async (m) => { trace.confirms.push(m); return 0 },
    alert: async (m, kind) => { trace.alerts.push({ message: m, kind }) },
    exit: () => {},
    ...overrides,
  }
}

async function run(source: string, ioOverrides: Partial<SyscallIO> = {}): Promise<Trace> {
  const program = assemble(source)
  expect(program.errors).toEqual([])
  const trace: Trace = { printed: [], alerts: [], confirms: [] }
  const sim = new Simulator(makeIO(trace, ioOverrides))
  sim.load(program)
  await sim.run()
  return trace
}

describe('Extended syscalls (Phase 2E)', () => {
  it('syscall 11 prints a single character', async () => {
    const trace = await run(`
      .text
      main:
        li      $a0, 65       # 'A'
        li      $v0, 11
        syscall
        li      $v0, 10
        syscall
    `)
    expect(trace.printed.join('')).toBe('A')
  })

  it('syscall 12 places the read char codepoint in $v0', async () => {
    const trace = await run(
      `
      .text
      main:
        li      $v0, 12
        syscall
        add     $a0, $v0, $zero
        li      $v0, 1
        syscall
        li      $v0, 10
        syscall
    `,
      { readChar: () => Promise.resolve('Z') },
    )
    expect(trace.printed.join('')).toBe('90')   // 'Z' = 90
  })

  it('syscall 30 puts the low 32 bits of Date.now() in $a0', async () => {
    // We can't predict the exact time, but we can confirm the
    // program runs to completion without throwing.
    const trace = await run(`
      .text
      main:
        li      $v0, 30
        syscall
        li      $v0, 10
        syscall
    `)
    expect(trace.printed).toEqual([])
  })

  it('syscall 41 fills $a0 with a random int (program runs)', async () => {
    const trace = await run(`
      .text
      main:
        li      $v0, 41
        syscall
        li      $v0, 10
        syscall
    `)
    expect(trace.printed).toEqual([])
  })

  it('syscall 50 invokes io.confirm with the prompt string', async () => {
    const trace = await run(`
      .data
      msg:    .asciiz "Continue?"
      .text
      main:
        la      $a0, msg
        li      $v0, 50
        syscall
        li      $v0, 10
        syscall
    `)
    expect(trace.confirms).toEqual(['Continue?'])
  })

  it('syscall 54 invokes io.alert with the prompt + kind from $a1', async () => {
    const trace = await run(`
      .data
      msg:    .asciiz "Done!"
      .text
      main:
        la      $a0, msg
        li      $a1, 2          # warn
        li      $v0, 54
        syscall
        li      $v0, 10
        syscall
    `)
    expect(trace.alerts).toEqual([{ message: 'Done!', kind: 'warn' }])
  })
})
