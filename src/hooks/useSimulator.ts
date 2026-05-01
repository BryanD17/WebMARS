import { create } from 'zustand'
import { assemble } from '../core/assembler'
import { createSim, stepSim, runSim, snapshotRegs } from '../core/simulator'
import type { SimState } from '../core/simulator'
import type {
  AssemblerError,
  InspectorTab,
  RegisterSnapshot,
  RuntimeError,
  SimStatus,
} from './types.ts'

const MIPS_TEXT_BASE = 0x00400000

const initialRegisters: RegisterSnapshot = {
  pc: MIPS_TEXT_BASE,
  hi: 0,
  lo: 0,
  gpr: {},
  changed: new Set<string>(),
}

// Mutable simulator state lives outside Zustand to avoid cloning overhead.
// Only the UI-relevant snapshot is stored in the Zustand store.
let _sim: SimState | null = null

interface SimulatorState {
  source:          string
  status:          SimStatus
  registers:       RegisterSnapshot
  consoleOutput:   string[]
  assemblerErrors: AssemblerError[]
  runtimeError:    RuntimeError | null
  inspectorTab:    InspectorTab
  memoryMap:       Map<number, number>

  setSource:       (next: string) => void
  setInspectorTab: (tab: InspectorTab) => void
  assemble:        () => void
  run:             () => void
  step:            () => void
  reset:           () => void
}

export const useSimulator = create<SimulatorState>((set, get) => ({
  source:          '',
  status:          'idle',
  registers:       initialRegisters,
  consoleOutput:   [],
  assemblerErrors: [],
  runtimeError:    null,
  inspectorTab:    'registers',
  memoryMap:       new Map(),

  setSource: (next) => set({ source: next, status: 'idle' }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),

  assemble: () => {
    const { source } = get()
    set({ status: 'assembling', assemblerErrors: [], runtimeError: null })

    const result = assemble(source)

    if (result.errors.length > 0) {
      set({
        status: 'error',
        assemblerErrors: result.errors.map(e => ({ line: e.line, message: e.message })),
      })
      return
    }

    _sim = createSim(result)
    set({
      status:          'ready',
      registers:       snapshotRegs(_sim),
      consoleOutput:   [],
      assemblerErrors: [],
      runtimeError:    null,
      memoryMap:       new Map(_sim.memory),
    })
  },

  step: () => {
    if (!_sim || _sim.halted) return

    const prev = {
      gpr: new Int32Array(_sim.gpr),
      pc:  _sim.pc,
      hi:  _sim.hi,
      lo:  _sim.lo,
    }

    stepSim(_sim)

    set({
      status:        _sim.halted ? (_sim.runtimeError ? 'error' : 'halted') : 'paused',
      registers:     snapshotRegs(_sim, prev),
      consoleOutput: [..._sim.output],
      memoryMap:     new Map(_sim.memory),
      runtimeError:  _sim.runtimeError
        ? { pc: _sim.pc, message: _sim.runtimeError }
        : null,
    })
  },

  run: () => {
    if (!_sim || _sim.halted) return

    set({ status: 'running' })
    runSim(_sim)

    set({
      status:        _sim.runtimeError ? 'error' : 'halted',
      registers:     snapshotRegs(_sim),
      consoleOutput: [..._sim.output],
      memoryMap:     new Map(_sim.memory),
      runtimeError:  _sim.runtimeError
        ? { pc: _sim.pc, message: _sim.runtimeError }
        : null,
    })
  },

  reset: () => {
    _sim = null
    set({
      status:          'idle',
      registers:       initialRegisters,
      consoleOutput:   [],
      assemblerErrors: [],
      runtimeError:    null,
      memoryMap:       new Map(),
    })
  },
}))
