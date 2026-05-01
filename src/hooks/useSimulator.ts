// src/hooks/useSimulator.ts — Zustand store. Day 1 ships stubs; Landon
// and Zachary fill in the real assemble/run/step paths on Day 2+.

import { create } from 'zustand'
import type {
  AssemblerError,
  InspectorTab,
  RegisterSnapshot,
  RuntimeError,
  SimStatus,
} from './types.ts'

const MIPS_TEXT_BASE = 0x00400000

// Pre-loaded so the editor never reads as a wireframe on first paint
// and so screenshots of WebMARS show working code, not an empty pane.
// The Day 5 examples-dropdown stretch goal will swap this through
// loadExample().
const HELLO_MIPS_SOURCE = `# Welcome to WebMARS.
# This is a working example. Click Assemble, then Run.

.data
msg:    .asciiz "Hello, MIPS!\\n"

.text
main:   li      $v0, 4          # syscall 4 = print string
        la      $a0, msg
        syscall

        li      $v0, 10         # syscall 10 = exit
        syscall
`

const EXAMPLES: Record<string, string> = {
  hello: HELLO_MIPS_SOURCE,
}

const initialRegisters: RegisterSnapshot = {
  pc: MIPS_TEXT_BASE,
  hi: 0,
  lo: 0,
  gpr: {},
  changed: new Set<string>(),
}

interface SimulatorState {
  // ─ data ─
  source: string
  status: SimStatus
  registers: RegisterSnapshot
  consoleOutput: string[]
  assemblerErrors: AssemblerError[]
  runtimeError: RuntimeError | null
  inspectorTab: InspectorTab

  // ─ actions (Zachary and Landon will fill these in) ─
  setSource: (next: string) => void
  setInspectorTab: (tab: InspectorTab) => void
  loadExample: (name: string) => void
  assemble: () => void
  run: () => void
  step: () => void
  reset: () => void
}

export const useSimulator = create<SimulatorState>((set) => ({
  source: HELLO_MIPS_SOURCE,
  status: 'idle',
  registers: initialRegisters,
  consoleOutput: [],
  assemblerErrors: [],
  runtimeError: null,
  inspectorTab: 'registers',

  setSource: (next) => set({ source: next }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),

  loadExample: (name) => {
    const next = EXAMPLES[name]
    if (next === undefined) {
      console.warn(`[loadExample] no example registered for "${name}"`)
      return
    }
    set({ source: next })
  },

  // ─ stubs — log + flip status only, no actual execution today ─
  assemble: () => {
    console.info('[stub] assemble')
    set({ status: 'ready' })
  },
  run: () => {
    console.info('[stub] run')
    set({ status: 'halted' })
  },
  step: () => {
    console.info('[stub] step')
    // Stub: advance pc by one MIPS instruction width so the dev-panel
    // visibly updates. Day 2 replaces this with real fetch+execute.
    set((state) => ({
      registers: {
        ...state.registers,
        pc: state.registers.pc + 4,
        changed: new Set<string>(['pc']),
      },
    }))
  },
  reset: () =>
    set({
      status: 'idle',
      registers: initialRegisters,
      consoleOutput: [],
      assemblerErrors: [],
      runtimeError: null,
    }),
}))
