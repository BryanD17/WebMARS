// src/hooks/types.ts — shared types across UI and core integration.
// These define the integration seam between Landon's core/ work and the UI.
// Do not change these signatures after Day 1 EOD without a team discussion.

export type SimStatus =
  | 'idle'
  | 'assembling'
  | 'ready'
  | 'running'
  | 'paused'
  | 'halted'
  | 'error'

export interface RegisterSnapshot {
  pc: number
  hi: number
  lo: number
  /** "$t0" → value, stored as i32 */
  gpr: Record<string, number>
  /** Names of registers changed by the last step (drives the flash animation) */
  changed: Set<string>
}

export interface AssemblerError {
  line: number
  message: string
}

export interface RuntimeError {
  pc: number
  message: string
}

export type InspectorTab = 'registers' | 'memory' | 'console'
