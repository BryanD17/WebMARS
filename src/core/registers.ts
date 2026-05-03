export const REGISTER_NAMES: string[] = [
  '$zero','$at','$v0','$v1',
  '$a0','$a1','$a2','$a3',
  '$t0','$t1','$t2','$t3','$t4','$t5','$t6','$t7',
  '$s0','$s1','$s2','$s3','$s4','$s5','$s6','$s7',
  '$t8','$t9',
  '$k0','$k1',
  '$gp','$sp','$fp','$ra'
];

export const REGISTER_INDEX: Record<string, number> = {};
REGISTER_NAMES.forEach((name, i) => { REGISTER_INDEX[name] = i; });
for (let i = 0; i < 32; i++) { REGISTER_INDEX[`$${i}`] = i; }
// FPU register names share the index space with the GPR set — both
// $zero and $f0 map to 0. The assembler dispatches on mnemonic, not
// register family, so reusing the index is harmless: a "$f0" token
// reaching the GPR-typed `add` opcode would just encode wrong, but
// the same is true of using "$zero" with FPU opcodes today.
for (let i = 0; i < 32; i++) { REGISTER_INDEX[`$f${i}`] = i; }

export function createRegisterFile(): number[] {
  const regs = new Array<number>(32).fill(0);
  const spIdx = REGISTER_INDEX['$sp'] ?? 29;
  const gpIdx = REGISTER_INDEX['$gp'] ?? 28;
  regs[spIdx] = 0x7fffeffc;
  regs[gpIdx] = 0x10008000;
  return regs;
}

export function toSigned32(n: number): number {
  return (n | 0);
}

export function toUnsigned32(n: number): number {
  return (n >>> 0);
}

// ─ FPU (coprocessor 1) ─────────────────────────────────────────────
//
// MIPS32 FPU exposes 32 single-precision registers $f0..$f31. Each is
// stored here as a raw 32-bit word; the .s and .w instructions
// reinterpret those bits as float32 / int32 on demand. Real MIPS32
// pairs adjacent slots for double-precision (e.g. $f0:$f1 holds a
// double); double-precision support is deferred — Phase 2B ships
// single-precision plus the integer ↔ single conversion ops.

export const FPU_REGISTER_NAMES: string[] = Array.from(
  { length: 32 },
  (_, i) => `$f${i}`,
)

export function createFpuRegisterFile(): number[] {
  return new Array<number>(32).fill(0)
}

// Reinterpret-cast helpers — JS doesn't have a native union type for
// f32/i32 bits, so go through a 4-byte ArrayBuffer view. The buffer
// is module-local, single-element, and reused per call.
const _convBuf  = new ArrayBuffer(4)
const _convI32  = new Int32Array(_convBuf)
const _convU32  = new Uint32Array(_convBuf)
const _convF32  = new Float32Array(_convBuf)

export function bitsToFloat(bits: number): number {
  _convI32[0] = bits | 0
  return _convF32[0] ?? 0
}

export function floatToBits(value: number): number {
  _convF32[0] = value
  return _convI32[0] ?? 0
}

export function bitsToUnsignedFloat(bits: number): number {
  _convU32[0] = bits >>> 0
  return _convF32[0] ?? 0
}
