export interface SimulatorState {
  registers: number[];
  hi: number;
  lo: number;
  pc: number;
  memory: Uint8Array;
  running: boolean;
  halted: boolean;
  stepCount: number;
  consoleOutput: string;
  consoleInputBuffer: string;
  lastChangedRegisters: Set<number>;
  error: string | null;
}

export interface AssembledProgram {
  instructions: number[];
  dataSegment: Uint8Array;
  textBase: number;
  dataBase: number;
  labels: Map<string, number>;
  sourceMap: Map<number, number>;
  errors: AssemblerError[];
}

export interface AssemblerError {
  line: number;
  message: string;
}

export interface SimulatorError {
  pc: number;
  line: number | null;
  message: string;
}

export type SimulatorStatus = 'idle' | 'assembled' | 'running' | 'paused' | 'halted' | 'error';
