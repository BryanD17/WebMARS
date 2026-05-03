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
