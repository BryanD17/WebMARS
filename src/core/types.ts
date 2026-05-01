// Engine-internal types only. Consumer-facing shapes (RegisterSnapshot,
// AssemblerError, RuntimeError, SimStatus) live in src/hooks/types.ts.

export interface AssembledProgram {
  instructions: number[]
  dataSegment: Uint8Array
  textBase: number
  dataBase: number
  labels: Map<string, number>
  sourceMap: Map<number, number>
  errors: EngineAssemblerError[]
}

export interface EngineAssemblerError {
  line: number
  message: string
}
