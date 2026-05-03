import { describe, it, expect, beforeEach } from 'vitest';
import { Simulator } from '../core/simulator';
import { TEXT_BASE, DATA_BASE } from '../core/memory';
import type { SyscallIO } from '../core/syscalls';
import type { AssembledProgram } from '../core/types';

function makeIO(): SyscallIO {
  return {
    print: () => {},
    readInt: () => Promise.resolve(0),
    readString: () => Promise.resolve(''),
    exit: () => {},
  };
}

function makeProgram(instructions: number[]): AssembledProgram {
  return {
    instructions,
    dataSegment: new Uint8Array(0),
    textBase: TEXT_BASE,
    dataBase: DATA_BASE,
    labels: new Map(),
    sourceMap: new Map(),
    errors: [],
  };
}

function rType(op: number, rs: number, rt: number, rd: number, shamt: number, funct: number): number {
  return ((op & 0x3f) << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | ((rd & 0x1f) << 11) | ((shamt & 0x1f) << 6) | (funct & 0x3f);
}

function iType(op: number, rs: number, rt: number, imm: number): number {
  return ((op & 0x3f) << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | (imm & 0xffff);
}

function jType(op: number, target: number): number {
  return ((op & 0x3f) << 26) | (target & 0x3ffffff);
}

let sim: Simulator;
beforeEach(() => { sim = new Simulator(makeIO()); });


describe('R-type arithmetic', () => {
  it('add: 3 + 4 = 7', async () => {
    // Set $t0=3, $t1=4, add $t2,$t0,$t1
    const prog = makeProgram([
      iType(0x09, 0, 8, 3),      // addiu $t0, $zero, 3
      iType(0x09, 0, 9, 4),      // addiu $t1, $zero, 4
      rType(0, 8, 9, 10, 0, 0x20), // add $t2, $t0, $t1
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(7);
  });

  it('sub: 10 - 3 = 7', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 10),
      iType(0x09, 0, 9, 3),
      rType(0, 8, 9, 10, 0, 0x22),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(7);
  });

  it('and: 0b1010 & 0b1100 = 0b1000', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 0b1010),
      iType(0x09, 0, 9, 0b1100),
      rType(0, 8, 9, 10, 0, 0x24),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(0b1000);
  });

  it('or: 0b1010 | 0b1100 = 0b1110', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 0b1010),
      iType(0x09, 0, 9, 0b1100),
      rType(0, 8, 9, 10, 0, 0x25),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(0b1110);
  });

  it('xor', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 0b1010),
      iType(0x09, 0, 9, 0b1100),
      rType(0, 8, 9, 10, 0, 0x26),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(0b0110);
  });

  it('nor: ~(a|b)', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 0),
      iType(0x09, 0, 9, 0),
      rType(0, 8, 9, 10, 0, 0x27),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(-1);
  });

  it('slt: 3 < 5 = 1', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 3),
      iType(0x09, 0, 9, 5),
      rType(0, 8, 9, 10, 0, 0x2a),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(1);
  });

  it('slt: 5 < 3 = 0', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 5),
      iType(0x09, 0, 9, 3),
      rType(0, 8, 9, 10, 0, 0x2a),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(0);
  });

  it('sll: 1 << 3 = 8', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 1),
      rType(0, 0, 8, 9, 3, 0x00),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[9]).toBe(8);
  });

  it('srl: 8 >>> 2 = 2', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 8),
      rType(0, 0, 8, 9, 2, 0x02),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[9]).toBe(2);
  });

  it('sra preserves sign', async () => {
    // -8 >> 2 = -2
    const prog = makeProgram([
      iType(0x08, 0, 8, -8 & 0xffff),  // addi $t0, $zero, -8
      rType(0, 0, 8, 9, 2, 0x03),       // sra $t1, $t0, 2
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[9]).toBe(-2);
  });
});

describe('I-type arithmetic', () => {
  it('addi: 10 + 5 = 15', async () => {
    const prog = makeProgram([iType(0x08, 0, 8, 15)]);
    sim.load(prog);
    await sim.step();
    expect(sim.getState().registers[8]).toBe(15);
  });

  it('andi: 0xff & 0x0f = 0x0f', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 0xff),
      iType(0x0c, 8, 9, 0x0f),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[9]).toBe(0x0f);
  });

  it('ori: 0xf0 | 0x0f = 0xff', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 0xf0),
      iType(0x0d, 8, 9, 0x0f),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[9]).toBe(0xff);
  });

  it('lui: loads upper 16 bits', async () => {
    const prog = makeProgram([iType(0x0f, 0, 8, 0x1001)]);
    sim.load(prog);
    await sim.step();
    expect(sim.getState().registers[8]).toBe(0x10010000);
  });

  it('slti: 3 < 10 = 1', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 3),
      iType(0x0a, 8, 9, 10),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[9]).toBe(1);
  });
});

describe('Multiply/Divide (HI/LO)', () => {
  it('mult sets LO correctly', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 6),
      iType(0x09, 0, 9, 7),
      rType(0, 8, 9, 0, 0, 0x18),
      rType(0, 0, 0, 10, 0, 0x12), // mflo
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[10]).toBe(42);
  });

  it('div sets LO (quotient) and HI (remainder)', async () => {
    const prog = makeProgram([
      iType(0x09, 0, 8, 17),
      iType(0x09, 0, 9, 5),
      rType(0, 8, 9, 0, 0, 0x1a),
      rType(0, 0, 0, 10, 0, 0x12), // mflo = 3
      rType(0, 0, 0, 11, 0, 0x10), // mfhi = 2
    ]);
    sim.load(prog);
    for (let i = 0; i < 5; i++) await sim.step();
    const state = sim.getState();
    expect(state.registers[10]).toBe(3);
    expect(state.registers[11]).toBe(2);
  });
});

describe('Load/Store', () => {
  it('sw then lw round-trips', async () => {
    const prog = makeProgram([
      // lui $t0, 0x1001 => $t0 = 0x10010000 = DATA_BASE
      iType(0x0f, 0, 8, 0x1001),
      iType(0x09, 0, 9, 42),
      iType(0x2b, 8, 9, 0),   // sw $t1, 0($t0)
      iType(0x23, 8, 10, 0),  // lw $t2, 0($t0)
    ]);
    sim.load(prog);
    for (let i = 0; i < 4; i++) await sim.step();
    expect(sim.getState().registers[10]).toBe(42);
  });

  it('sb then lbu round-trips', async () => {
    const prog = makeProgram([
      iType(0x0f, 0, 8, 0x1001),
      iType(0x09, 0, 9, 0xab),
      iType(0x28, 8, 9, 0),   // sb
      iType(0x24, 8, 10, 0),  // lbu
    ]);
    sim.load(prog);
    for (let i = 0; i < 4; i++) await sim.step();
    expect(sim.getState().registers[10]).toBe(0xab);
  });
});

describe('Branches', () => {
  it('beq taken: skips next instruction', async () => {
    // PC is already +4 when branch offset applies, so offset=2 skips 1 instruction:
    // PC+4 + 2*4 - 4 = PC+8 → lands at index 2
    const prog = makeProgram([
      iType(0x04, 0, 0, 2),    // beq $zero, $zero, +2
      iType(0x09, 0, 8, 99),   // addiu $t0, 99 (skipped)
      iType(0x09, 0, 8, 1),    // addiu $t0, 1
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[8]).toBe(1);
  });

  it('bne not taken when equal', async () => {
    const prog = makeProgram([
      iType(0x05, 0, 0, 1),    // bne $zero, $zero, +1 (not taken)
      iType(0x09, 0, 8, 5),    // addiu $t0, 5
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[8]).toBe(5);
  });
});

describe('Jump', () => {
  it('j jumps to correct address', async () => {
    // Jump to TEXT_BASE + 8 (skip instruction at +4)
    const target = ((TEXT_BASE + 8) >>> 2) & 0x3ffffff;
    const prog = makeProgram([
      jType(0x02, target),         // j TEXT_BASE+8
      iType(0x09, 0, 8, 99),      // skipped
      iType(0x09, 0, 8, 1),       // reached
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[8]).toBe(1);
  });

  it('jal saves return address in $ra', async () => {
    const target = ((TEXT_BASE + 8) >>> 2) & 0x3ffffff;
    const prog = makeProgram([
      jType(0x03, target),         // jal TEXT_BASE+8
      iType(0x09, 0, 8, 99),      // skipped
      iType(0x09, 0, 8, 1),       // reached
    ]);
    sim.load(prog);
    await sim.step();
    expect(sim.getState().registers[31]).toBe(TEXT_BASE + 4);
  });

  it('jr jumps to register value', async () => {
    // Instructions: [0]=lui [1]=ori [2]=jr [3]=skipped(99) [4]=reached(1)
    // dest must be TEXT_BASE+16 to skip [3] and land on [4]
    const dest = TEXT_BASE + 16;
    const prog = makeProgram([
      iType(0x0f, 0, 8, (dest >>> 16) & 0xffff),   // lui $t0, upper
      iType(0x0d, 8, 8, dest & 0xffff),              // ori $t0, lower
      rType(0, 8, 0, 0, 0, 0x08),                    // jr $t0
      iType(0x09, 0, 9, 99),                          // skipped
      iType(0x09, 0, 9, 1),                           // reached
    ]);
    sim.load(prog);
    await sim.step(); await sim.step(); await sim.step(); await sim.step();
    expect(sim.getState().registers[9]).toBe(1);
  });
});

describe('lui + ori (li large)', () => {
  it('loads 0x12345678', async () => {
    const prog = makeProgram([
      iType(0x0f, 0, 8, 0x1234),
      iType(0x0d, 8, 8, 0x5678),
    ]);
    sim.load(prog);
    await sim.step(); await sim.step();
    expect(sim.getState().registers[8]).toBe(0x12345678);
  });
});
