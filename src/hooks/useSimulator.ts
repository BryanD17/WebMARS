import { create } from 'zustand'
import { Simulator } from '../core/simulator.ts'
import { assemble } from '../core/instructions.ts'
import { REGISTER_NAMES } from '../core/registers.ts'
import type { AssembledProgram } from '../core/types.ts'
import type {
  AssemblerError,
  InspectorTab,
  RegisterSnapshot,
  RuntimeError,
  SimStatus,
} from './types.ts'

// Canonical MIPS / real-MARS conventions: program text starts at
// 0x00400000 and the stack pointer initializes at 0x7FFFEFFC (top of
// the user stack segment, just below the kernel-reserved region). The
// engine's createRegisterFile() in src/core/registers.ts uses the same
// value, so the pre-Assemble register table and the post-Assemble
// snapshot agree on $sp without a visible value jump.
const MIPS_TEXT_BASE = 0x00400000
const MIPS_STACK_TOP = 0x7fffeffc

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

function buildInitialGpr(): Record<string, number> {
  const gpr: Record<string, number> = {}
  for (const name of REGISTER_NAMES) {
    gpr[name] = 0
  }
  gpr['$sp'] = MIPS_STACK_TOP
  return gpr
}

const initialRegisters: RegisterSnapshot = {
  pc: MIPS_TEXT_BASE,
  hi: 0,
  lo: 0,
  gpr: buildInitialGpr(),
  changed: new Set<string>(),
}

// Translate the engine's numeric-index lastChangedRegisters + prev/next
// pc/hi/lo into the contract's named Set<string>.
function buildChangedSet(
  engineState: { registers: number[]; hi: number; lo: number; pc: number; lastChangedRegisters: Set<number> },
  prev: RegisterSnapshot,
): Set<string> {
  const changed = new Set<string>()
  for (const idx of engineState.lastChangedRegisters) {
    const name = REGISTER_NAMES[idx]
    if (name !== undefined) changed.add(name)
  }
  if (engineState.pc !== prev.pc) changed.add('pc')
  if (engineState.hi !== prev.hi) changed.add('hi')
  if (engineState.lo !== prev.lo) changed.add('lo')
  return changed
}

function buildSnapshot(
  engineState: { registers: number[]; hi: number; lo: number; pc: number; lastChangedRegisters: Set<number> },
  prev: RegisterSnapshot,
): RegisterSnapshot {
  const gpr: Record<string, number> = {}
  for (let i = 0; i < REGISTER_NAMES.length; i++) {
    const name = REGISTER_NAMES[i]
    if (name !== undefined) gpr[name] = engineState.registers[i] ?? 0
  }
  return {
    pc: engineState.pc,
    hi: engineState.hi,
    lo: engineState.lo,
    gpr,
    changed: buildChangedSet(engineState, prev),
  }
}

// Engine-level AssemblerError → contract AssemblerError (same shape, different source)
function toContractErrors(errs: { line: number; message: string }[]): AssemblerError[] {
  return errs.map((e) => ({ line: e.line, message: e.message }))
}

// ─ layout slice (additive — frozen contract preserved) ─

export type LeftPanelKey =
  | 'project' | 'symbols' | 'breakpoints' | 'reference' | 'syscalls' | 'recent' | 'tools'

export type BottomPanelTab = 'console' | 'messages' | 'problems'

interface PersistedLayout {
  leftRailExpanded: boolean
  leftPanelKey: LeftPanelKey
  bottomPanelOpen: boolean
  bottomPanelTab: BottomPanelTab
  rightPanelOpen: boolean
}

const LAYOUT_STORAGE_KEY = 'webmars:layout'
const LEFT_PANEL_KEYS: ReadonlyArray<LeftPanelKey> = [
  'project', 'symbols', 'breakpoints', 'reference', 'syscalls', 'recent', 'tools',
]
const BOTTOM_PANEL_TABS: ReadonlyArray<BottomPanelTab> = ['console', 'messages', 'problems']

function readPersistedLayout(): Partial<PersistedLayout> {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: Partial<PersistedLayout> = {}
    const obj = parsed as Record<string, unknown>
    if (typeof obj.leftRailExpanded === 'boolean') out.leftRailExpanded = obj.leftRailExpanded
    if (typeof obj.bottomPanelOpen === 'boolean')  out.bottomPanelOpen  = obj.bottomPanelOpen
    if (typeof obj.rightPanelOpen === 'boolean')   out.rightPanelOpen   = obj.rightPanelOpen
    if (typeof obj.leftPanelKey === 'string' && (LEFT_PANEL_KEYS as ReadonlyArray<string>).includes(obj.leftPanelKey)) {
      out.leftPanelKey = obj.leftPanelKey as LeftPanelKey
    }
    if (typeof obj.bottomPanelTab === 'string' && (BOTTOM_PANEL_TABS as ReadonlyArray<string>).includes(obj.bottomPanelTab)) {
      out.bottomPanelTab = obj.bottomPanelTab as BottomPanelTab
    }
    return out
  } catch {
    return {}
  }
}

function writePersistedLayout(layout: PersistedLayout): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // localStorage can throw under privacy mode / quota — silent fall-through is fine
  }
}

function computeInitialLayout(): PersistedLayout {
  const persisted = readPersistedLayout()
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth
  return {
    leftRailExpanded: persisted.leftRailExpanded ?? width >= 1280,
    leftPanelKey:    persisted.leftPanelKey    ?? 'project',
    bottomPanelOpen: persisted.bottomPanelOpen ?? width >= 768,
    bottomPanelTab:  persisted.bottomPanelTab  ?? 'console',
    rightPanelOpen:  persisted.rightPanelOpen  ?? width >= 1024,
  }
}

interface SimulatorStoreState {
  // ─ contract fields (must match src/hooks/types.ts) ─
  source: string
  status: SimStatus
  registers: RegisterSnapshot
  consoleOutput: string[]
  assemblerErrors: AssemblerError[]
  runtimeError: RuntimeError | null
  inspectorTab: InspectorTab

  // ─ contract actions ─
  setSource: (next: string) => void
  setInspectorTab: (tab: InspectorTab) => void
  loadExample: (name: string) => void
  assemble: () => void
  run: () => void
  step: () => void
  reset: () => void

  // ─ extensions (engine-specific, not required by contract) ─
  stop: () => void
  program: AssembledProgram | null

  // ─ layout slice (additive; persisted to webmars:layout) ─
  leftRailExpanded: boolean
  leftPanelKey: LeftPanelKey
  bottomPanelOpen: boolean
  bottomPanelTab: BottomPanelTab
  rightPanelOpen: boolean

  toggleLeftRail: () => void
  setLeftPanel: (key: LeftPanelKey) => void
  toggleBottomPanel: () => void
  setBottomTab: (tab: BottomPanelTab) => void
  toggleRightPanel: () => void
}

let _sim: Simulator | null = null
let _stopFlag = false

export const useSimulator = create<SimulatorStoreState>((set, get) => {
  function makeSim(): Simulator {
    if (_sim) return _sim
    _sim = new Simulator({
      print: (s) => {
        set((state) => ({ consoleOutput: [...state.consoleOutput, s] }))
      },
      // I/O syscalls (5, 8) stubbed — full console wiring is a Day 5 task.
      readInt: () => Promise.resolve(0),
      readString: () => Promise.resolve(''),
      exit: () => {
        _stopFlag = true
      },
    })
    return _sim
  }

  const initialLayout = computeInitialLayout()

  function persistLayout(): void {
    const s = get()
    writePersistedLayout({
      leftRailExpanded: s.leftRailExpanded,
      leftPanelKey:     s.leftPanelKey,
      bottomPanelOpen:  s.bottomPanelOpen,
      bottomPanelTab:   s.bottomPanelTab,
      rightPanelOpen:   s.rightPanelOpen,
    })
  }

  return {
    source: HELLO_MIPS_SOURCE,
    status: 'idle',
    registers: initialRegisters,
    consoleOutput: [],
    assemblerErrors: [],
    runtimeError: null,
    inspectorTab: 'registers',
    program: null,

    // layout slice — initial values from localStorage (or viewport defaults)
    leftRailExpanded: initialLayout.leftRailExpanded,
    leftPanelKey:     initialLayout.leftPanelKey,
    bottomPanelOpen:  initialLayout.bottomPanelOpen,
    bottomPanelTab:   initialLayout.bottomPanelTab,
    rightPanelOpen:   initialLayout.rightPanelOpen,

    toggleLeftRail: () => {
      set((s) => ({ leftRailExpanded: !s.leftRailExpanded }))
      persistLayout()
    },
    setLeftPanel: (key) => {
      set({ leftPanelKey: key })
      persistLayout()
    },
    toggleBottomPanel: () => {
      set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen }))
      persistLayout()
    },
    setBottomTab: (tab) => {
      set({ bottomPanelTab: tab })
      persistLayout()
    },
    toggleRightPanel: () => {
      set((s) => ({ rightPanelOpen: !s.rightPanelOpen }))
      persistLayout()
    },

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

    assemble: () => {
      const source = get().source
      const program = assemble(source)
      if (program.errors.length > 0) {
        set({
          status: 'error',
          assemblerErrors: toContractErrors(program.errors),
          runtimeError: null,
        })
        return
      }
      _sim = null
      _stopFlag = false
      const sim = makeSim()
      sim.load(program)
      const engineState = sim.getState()
      set({
        status: 'ready',
        program,
        registers: buildSnapshot(engineState, initialRegisters),
        consoleOutput: [],
        assemblerErrors: [],
        runtimeError: null,
      })
    },

    step: () => {
      const { status, registers: prevRegisters } = get()
      if (status !== 'ready' && status !== 'paused') return
      const sim = makeSim()
      void (async () => {
        try {
          set({ status: 'running' })
          await sim.step()
          const engineState = sim.getState()
          set({
            status: sim.isHalted() ? 'halted' : 'paused',
            registers: buildSnapshot(engineState, prevRegisters),
          })
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e)
          set({
            status: 'error',
            runtimeError: { pc: get().registers.pc, message },
          })
        }
      })()
    },

    run: () => {
      const { status } = get()
      if (status !== 'ready' && status !== 'paused') return
      const sim = makeSim()
      _stopFlag = false
      set({ status: 'running' })
      void (async () => {
        try {
          for (let i = 0; i < 1_000_000 && !sim.isHalted() && !_stopFlag; i++) {
            const prevRegisters = get().registers
            await sim.step()
            if (i % 500 === 0) {
              const engineState = sim.getState()
              set({ registers: buildSnapshot(engineState, prevRegisters) })
              await new Promise<void>((r) => setTimeout(r, 0))
            }
          }
          const engineState = sim.getState()
          const prevRegisters = get().registers
          set({
            status: sim.isHalted() ? 'halted' : _stopFlag ? 'paused' : 'paused',
            registers: buildSnapshot(engineState, prevRegisters),
          })
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e)
          set({
            status: 'error',
            runtimeError: { pc: get().registers.pc, message },
          })
        }
      })()
    },

    reset: () => {
      _stopFlag = true
      const sim = _sim
      if (sim) sim.reset()
      const engineState = sim?.getState()
      set({
        status: sim ? 'ready' : 'idle',
        registers: engineState
          ? buildSnapshot(engineState, initialRegisters)
          : initialRegisters,
        consoleOutput: [],
        assemblerErrors: [],
        runtimeError: null,
      })
      _stopFlag = false
    },

    stop: () => {
      _stopFlag = true
      set({ status: 'paused' })
    },
  }
})
