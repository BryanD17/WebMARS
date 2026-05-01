/**
 * simulator.ts
 * MIPS fetch-decode-execute engine.
 *
 * Usage:
 *   const sim = createSim(assembleResult);
 *   stepSim(sim);          // one instruction
 *   runSim(sim);           // run to halt or step limit
 *   snapshotRegs(sim);     // RegisterSnapshot for UI
 */

import type { AssembleResult } from "./assembler";
import type { RegisterSnapshot } from "../hooks/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TEXT_BASE  = 0x00400000;
const STACK_BASE = 0x7ffffffc;
const MAX_STEPS  = 2_000_000;

// ─── GPR name table ──────────────────────────────────────────────────────────

export const GPR_NAMES: readonly string[] = [
  "$zero","$at","$v0","$v1","$a0","$a1","$a2","$a3",
  "$t0","$t1","$t2","$t3","$t4","$t5","$t6","$t7",
  "$s0","$s1","$s2","$s3","$s4","$s5","$s6","$s7",
  "$t8","$t9","$k0","$k1","$gp","$sp","$fp","$ra",
];

// ─── Simulator state ──────────────────────────────────────────────────────────

export interface SimState {
  gpr:          Int32Array;          // $0–$31
  pc:           number;              // byte address
  hi:           number;
  lo:           number;
  text:         Int32Array;          // decoded instruction words
  memory:       Map<number, number>; // word-aligned addr → i32
  halted:       boolean;
  runtimeError: string | null;
  output:       string[];
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSim(result: AssembleResult): SimState {
  const gpr = new Int32Array(32);
  gpr[29] = STACK_BASE; // $sp

  const memory = new Map<number, number>();
  for (const dw of result.data) {
    memory.set(dw.address & ~3, dw.value | 0);
  }

  const text = new Int32Array(result.output.length);
  for (let i = 0; i < result.output.length; i++) {
    text[i] = parseInt(result.output[i]!.binary, 2) | 0;
  }

  return {
    gpr, pc: TEXT_BASE, hi: 0, lo: 0,
    text, memory,
    halted: result.output.length === 0,
    runtimeError: null,
    output: [],
  };
}

// ─── Memory helpers (big-endian MIPS) ────────────────────────────────────────

function mWord(mem: Map<number, number>, addr: number): number {
  return mem.get(addr & ~3) ?? 0;
}
function wWord(mem: Map<number, number>, addr: number, v: number): void {
  mem.set(addr & ~3, v | 0);
}
function mHalf(mem: Map<number, number>, addr: number, signed: boolean): number {
  const shift = (2 - (addr & 2)) * 8;
  const half = (mWord(mem, addr) >>> shift) & 0xffff;
  return signed ? (half << 16) >> 16 : half;
}
function wHalf(mem: Map<number, number>, addr: number, v: number): void {
  const shift = (2 - (addr & 2)) * 8;
  const w = mWord(mem, addr);
  wWord(mem, addr, (w & ~(0xffff << shift)) | ((v & 0xffff) << shift));
}
function mByte(mem: Map<number, number>, addr: number, signed: boolean): number {
  const shift = (3 - (addr & 3)) * 8;
  const b = (mWord(mem, addr) >>> shift) & 0xff;
  return signed ? (b << 24) >> 24 : b;
}
function wByte(mem: Map<number, number>, addr: number, v: number): void {
  const shift = (3 - (addr & 3)) * 8;
  const w = mWord(mem, addr);
  wWord(mem, addr, (w & ~(0xff << shift)) | ((v & 0xff) << shift));
}

// ─── Step ─────────────────────────────────────────────────────────────────────

export function stepSim(s: SimState): void {
  if (s.halted) return;

  const idx = (s.pc - TEXT_BASE) >> 2;
  if (idx < 0 || idx >= s.text.length) {
    s.runtimeError = `PC 0x${s.pc.toString(16).padStart(8, "0")} out of text segment`;
    s.halted = true;
    return;
  }

  const instr   = s.text[idx]!;
  const nextPc  = s.pc + 4;
  const opcode  = (instr >>> 26) & 0x3f;
  const rs      = (instr >>> 21) & 0x1f;
  const rt      = (instr >>> 16) & 0x1f;
  const rd      = (instr >>> 11) & 0x1f;
  const shamt   = (instr >>>  6) & 0x1f;
  const funct   =  instr         & 0x3f;
  const imm16   =  instr         & 0xffff;
  const sImm    = (imm16 << 16) >> 16;  // sign-extended
  const target  =  instr         & 0x3ffffff;

  s.pc = nextPc; // default advance; branches/jumps overwrite

  const g = (i: number) => s.gpr[i] ?? 0;

  try {
    if (opcode === 0) {
      // ── R-type ─────────────────────────────────────────────────────────────
      switch (funct) {
        case 0x00: s.gpr[rd] = g(rt) << shamt; break;             // sll
        case 0x02: s.gpr[rd] = g(rt) >>> shamt; break;            // srl
        case 0x03: s.gpr[rd] = g(rt) >> shamt; break;             // sra
        case 0x04: s.gpr[rd] = g(rt) << (g(rs) & 0x1f); break;   // sllv
        case 0x06: s.gpr[rd] = g(rt) >>> (g(rs) & 0x1f); break;  // srlv
        case 0x08: s.pc = g(rs); break;                            // jr
        case 0x09: s.gpr[rd] = nextPc; s.pc = g(rs); break;       // jalr
        case 0x0c: execSyscall(s); break;                          // syscall
        case 0x0d: s.halted = true; break;                         // break
        case 0x10: s.gpr[rd] = s.hi; break;                       // mfhi
        case 0x12: s.gpr[rd] = s.lo; break;                       // mflo
        case 0x18: { // mult (signed 64-bit)
          const r = BigInt(g(rs)) * BigInt(g(rt));
          s.lo = Number(r & 0xffffffffn) | 0;
          s.hi = Number((r >> 32n) & 0xffffffffn) | 0;
          break;
        }
        case 0x19: { // multu (unsigned 64-bit)
          const r = BigInt(g(rs) >>> 0) * BigInt(g(rt) >>> 0);
          s.lo = Number(r & 0xffffffffn) | 0;
          s.hi = Number((r >> 32n) & 0xffffffffn) | 0;
          break;
        }
        case 0x1a: { // div
          const d = g(rt);
          if (d === 0) throw new Error("Division by zero");
          s.lo = (g(rs) / d) | 0;
          s.hi = (g(rs) % d) | 0;
          break;
        }
        case 0x1b: { // divu
          const a = g(rs) >>> 0, b = g(rt) >>> 0;
          if (b === 0) throw new Error("Division by zero");
          s.lo = (a / b) | 0;
          s.hi = (a % b) | 0;
          break;
        }
        case 0x20: case 0x21: s.gpr[rd] = (g(rs) + g(rt)) | 0; break; // add/addu
        case 0x22: case 0x23: s.gpr[rd] = (g(rs) - g(rt)) | 0; break; // sub/subu
        case 0x24: s.gpr[rd] = g(rs) & g(rt); break;  // and
        case 0x25: s.gpr[rd] = g(rs) | g(rt); break;  // or
        case 0x26: s.gpr[rd] = g(rs) ^ g(rt); break;  // xor
        case 0x27: s.gpr[rd] = ~(g(rs) | g(rt)); break; // nor
        case 0x2a: s.gpr[rd] = g(rs) < g(rt) ? 1 : 0; break;             // slt
        case 0x2b: s.gpr[rd] = (g(rs) >>> 0) < (g(rt) >>> 0) ? 1 : 0; break; // sltu
        default: throw new Error(`Unknown funct 0x${funct.toString(16)}`);
      }
    } else if (opcode === 2 || opcode === 3) {
      // ── J-type ─────────────────────────────────────────────────────────────
      const dest = (nextPc & 0xf0000000) | (target << 2);
      if (opcode === 3) s.gpr[31] = nextPc; // jal: $ra = PC+4
      s.pc = dest;
    } else {
      // ── I-type ─────────────────────────────────────────────────────────────
      const mem = s.memory;
      switch (opcode) {
        // bltz / bgez
        case 0x01:
          if (rt === 0 && g(rs) < 0)  s.pc = nextPc + sImm * 4; // bltz
          if (rt === 1 && g(rs) >= 0) s.pc = nextPc + sImm * 4; // bgez
          break;
        // branches
        case 0x04: if (g(rs) === g(rt))           s.pc = nextPc + sImm * 4; break; // beq
        case 0x05: if (g(rs) !== g(rt))           s.pc = nextPc + sImm * 4; break; // bne
        case 0x06: if (g(rs) <= 0)                s.pc = nextPc + sImm * 4; break; // blez
        case 0x07: if (g(rs) > 0)                 s.pc = nextPc + sImm * 4; break; // bgtz
        // arithmetic / logic
        case 0x08: case 0x09: s.gpr[rt] = (g(rs) + sImm) | 0; break; // addi/addiu
        case 0x0a: s.gpr[rt] = g(rs) < sImm ? 1 : 0; break;           // slti
        case 0x0b: s.gpr[rt] = (g(rs) >>> 0) < (sImm >>> 0) ? 1 : 0; break; // sltiu
        case 0x0c: s.gpr[rt] = g(rs) & imm16; break;                   // andi
        case 0x0d: s.gpr[rt] = g(rs) | imm16; break;                   // ori
        case 0x0e: s.gpr[rt] = g(rs) ^ imm16; break;                   // xori
        case 0x0f: s.gpr[rt] = (imm16 << 16) | 0; break;               // lui
        // loads
        case 0x20: s.gpr[rt] = mByte(mem, (g(rs) + sImm) | 0, true);  break; // lb
        case 0x21: s.gpr[rt] = mHalf(mem, (g(rs) + sImm) | 0, true);  break; // lh
        case 0x23: s.gpr[rt] = mWord(mem, (g(rs) + sImm) | 0);         break; // lw
        case 0x24: s.gpr[rt] = mByte(mem, (g(rs) + sImm) | 0, false); break; // lbu
        case 0x25: s.gpr[rt] = mHalf(mem, (g(rs) + sImm) | 0, false); break; // lhu
        // stores
        case 0x28: wByte(mem, (g(rs) + sImm) | 0, g(rt)); break; // sb
        case 0x29: wHalf(mem, (g(rs) + sImm) | 0, g(rt)); break; // sh
        case 0x2b: wWord(mem, (g(rs) + sImm) | 0, g(rt)); break; // sw
        default: throw new Error(`Unknown opcode 0x${opcode.toString(16)}`);
      }
    }
  } catch (e: unknown) {
    s.runtimeError = e instanceof Error ? e.message : String(e);
    s.halted = true;
  }

  s.gpr[0] = 0; // $zero is always 0
}

// ─── Run all ──────────────────────────────────────────────────────────────────

export function runSim(s: SimState): void {
  let n = 0;
  while (!s.halted && n < MAX_STEPS) {
    stepSim(s);
    n++;
  }
  if (n >= MAX_STEPS && !s.halted) {
    s.runtimeError = "Execution limit reached — possible infinite loop";
    s.halted = true;
  }
}

// ─── Syscall handler ──────────────────────────────────────────────────────────

function execSyscall(s: SimState): void {
  const code = s.gpr[2]! | 0; // $v0
  const a0   = s.gpr[4]! | 0; // $a0

  switch (code) {
    case 1:  // print_int
      s.output.push(String(a0));
      break;
    case 4: { // print_string
      let addr = a0 >>> 0;
      let str = "";
      for (let i = 0; i < 65536; i++) {
        const b = mByte(s.memory, addr++, false);
        if (b === 0) break;
        str += String.fromCharCode(b);
      }
      s.output.push(str);
      break;
    }
    case 5:  // read_int — no sync browser input; return 0
      s.gpr[2] = 0;
      break;
    case 8:  // read_string — no sync browser input; no-op
      break;
    case 10: // exit
      s.halted = true;
      break;
    case 11: // print_char
      s.output.push(String.fromCharCode(a0 & 0xff));
      break;
    case 17: // exit2
      s.halted = true;
      break;
    default:
      throw new Error(`Unknown syscall ${code}`);
  }
}

// ─── Register snapshot for UI ─────────────────────────────────────────────────

export function snapshotRegs(
  s: SimState,
  prev?: { gpr: Int32Array; pc: number; hi: number; lo: number },
): RegisterSnapshot {
  const gpr: Record<string, number> = {};
  const changed = new Set<string>();

  for (let i = 0; i < 32; i++) {
    const name = GPR_NAMES[i]!;
    gpr[name] = s.gpr[i]!;
    if (prev && s.gpr[i] !== prev.gpr[i]) changed.add(name);
  }
  if (prev) {
    if (s.pc !== prev.pc) changed.add("pc");
    if (s.hi !== prev.hi) changed.add("hi");
    if (s.lo !== prev.lo) changed.add("lo");
  }

  return { pc: s.pc, hi: s.hi, lo: s.lo, gpr, changed };
}
