import { create } from 'zustand';
import { Simulator } from '../core/simulator';
import { assemble } from '../core/instructions';
import { TEXT_BASE, DATA_BASE } from '../core/memory';
import type { AssembledProgram, SimulatorStatus } from '../core/types';

interface InputRequest {
  type: 'int' | 'string';
  maxLen?: number;
  resolve: (val: string) => void;
}

interface SimulatorStore {
  status: SimulatorStatus;
  registers: number[];
  hi: number;
  lo: number;
  pc: number;
  lastChangedRegisters: Set<number>;
  consoleOutput: string;
  errorMessage: string | null;
  stepCount: number;
  memoryDump: { addr: number; word: number }[];
  memoryViewAddr: number;
  program: AssembledProgram | null;
  inputRequest: InputRequest | null;
  source: string;

  setSource: (src: string) => void;
  assemble: (source: string) => void;
  step: () => Promise<void>;
  run: () => Promise<void>;
  reset: () => void;
  stop: () => void;
  setMemoryViewAddr: (addr: number) => void;
  submitInput: (val: string) => void;
  appendConsole: (s: string) => void;
}

let _sim: Simulator | null = null;
let _stopFlag = false;

function getOrCreateSim(store: SimulatorStore, set: (s: Partial<SimulatorStore>) => void, get: () => SimulatorStore): Simulator {
  if (!_sim) {
    _sim = new Simulator({
      print: (s) => {
        set({ consoleOutput: get().consoleOutput + s });
      },
      readInt: () => new Promise<number>((resolve) => {
        set({
          inputRequest: {
            type: 'int',
            resolve: (val: string) => resolve(parseInt(val, 10) || 0),
          }
        });
      }),
      readString: (maxLen: number) => new Promise<string>((resolve) => {
        set({
          inputRequest: {
            type: 'string',
            maxLen,
            resolve: (val: string) => resolve(val),
          }
        });
      }),
      exit: () => {
        _stopFlag = true;
        set({ status: 'halted' });
      },
    });
  }
  return _sim;
}

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  status: 'idle',
  registers: new Array(32).fill(0),
  hi: 0,
  lo: 0,
  pc: TEXT_BASE,
  lastChangedRegisters: new Set(),
  consoleOutput: '',
  errorMessage: null,
  stepCount: 0,
  memoryDump: [],
  memoryViewAddr: DATA_BASE,
  program: null,
  inputRequest: null,
  source: '',

  setSource: (src) => set({ source: src }),

  assemble: (source) => {
    const program = assemble(source);
    if (program.errors.length > 0) {
      set({
        status: 'error',
        errorMessage: program.errors.map(e => `Line ${e.line}: ${e.message}`).join('; '),
        program,
      });
      return;
    }
    _sim = null;
    _stopFlag = false;
    const sim = getOrCreateSim(get(), set, get);
    sim.load(program);
    const state = sim.getState();
    set({
      status: 'assembled',
      program,
      registers: state.registers,
      hi: state.hi,
      lo: state.lo,
      pc: state.pc,
      lastChangedRegisters: new Set(),
      consoleOutput: '',
      errorMessage: null,
      stepCount: 0,
      memoryDump: sim.memoryDump(get().memoryViewAddr, 32),
    });
  },

  step: async () => {
    const { status } = get();
    if (status !== 'assembled' && status !== 'paused') return;
    const sim = getOrCreateSim(get(), set, get);
    try {
      set({ status: 'running' });
      await sim.step();
      const state = sim.getState();
      set({
        status: sim.isHalted() ? 'halted' : 'paused',
        registers: state.registers,
        hi: state.hi,
        lo: state.lo,
        pc: state.pc,
        lastChangedRegisters: state.lastChangedRegisters,
        stepCount: state.stepCount,
        memoryDump: sim.memoryDump(get().memoryViewAddr, 32),
        inputRequest: null,
      });
    } catch (e: unknown) {
      set({ status: 'error', errorMessage: (e as Error).message });
    }
  },

  run: async () => {
    const { status } = get();
    if (status !== 'assembled' && status !== 'paused') return;
    const sim = getOrCreateSim(get(), set, get);
    _stopFlag = false;
    set({ status: 'running' });

    try {
      for (let i = 0; i < 1_000_000 && !sim.isHalted() && !_stopFlag; i++) {
        await sim.step();
        if (i % 1000 === 0) {
          const state = sim.getState();
          set({
            registers: state.registers,
            hi: state.hi,
            lo: state.lo,
            pc: state.pc,
            lastChangedRegisters: state.lastChangedRegisters,
            stepCount: state.stepCount,
          });
          await new Promise(r => setTimeout(r, 0));
        }
        if (get().inputRequest) {
          // Pause for input
          await new Promise<void>(resolve => {
            const unsub = useSimulatorStore.subscribe((s) => {
              if (!s.inputRequest) { unsub(); resolve(); }
            });
          });
        }
      }
      const state = sim.getState();
      set({
        status: sim.isHalted() ? 'halted' : _stopFlag ? 'paused' : 'paused',
        registers: state.registers,
        hi: state.hi,
        lo: state.lo,
        pc: state.pc,
        lastChangedRegisters: state.lastChangedRegisters,
        stepCount: state.stepCount,
        memoryDump: sim.memoryDump(get().memoryViewAddr, 32),
        inputRequest: null,
      });
    } catch (e: unknown) {
      set({ status: 'error', errorMessage: (e as Error).message });
    }
  },

  reset: () => {
    _stopFlag = true;
    const sim = _sim;
    if (sim) sim.reset();
    const state = sim?.getState();
    set({
      status: 'assembled',
      registers: state?.registers ?? new Array(32).fill(0),
      hi: 0,
      lo: 0,
      pc: TEXT_BASE,
      lastChangedRegisters: new Set(),
      consoleOutput: '',
      errorMessage: null,
      stepCount: 0,
      inputRequest: null,
      memoryDump: sim ? sim.memoryDump(get().memoryViewAddr, 32) : [],
    });
    _stopFlag = false;
  },

  stop: () => {
    _stopFlag = true;
    set({ status: 'paused' });
  },

  setMemoryViewAddr: (addr) => {
    const sim = _sim;
    set({
      memoryViewAddr: addr,
      memoryDump: sim ? sim.memoryDump(addr, 32) : [],
    });
  },

  submitInput: (val) => {
    const { inputRequest } = get();
    if (inputRequest) {
      inputRequest.resolve(val);
      set({ inputRequest: null });
    }
  },

  appendConsole: (s) => set({ consoleOutput: get().consoleOutput + s }),
}));
