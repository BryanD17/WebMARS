import { describe, it, expect, beforeEach } from 'vitest';
import { Simulator } from '../core/simulator';
import { TEXT_BASE, DATA_BASE } from '../core/memory';
import type { SyscallIO } from '../core/syscalls';
import type { AssembledProgram } from '../core/types';

function makeIO(overrides: Partial<SyscallIO> = {}): SyscallIO {
  return {
    print: () => {},
    readInt: () => Promise.resolve(0),
    readString: () => Promise.resolve(''),
    exit: () => {},
    ...overrides,
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

let sim: Simulator;
beforeEach(() => { sim = new Simulator(makeIO()); });

describe('State machine', () => {
  it('starts not halted', () => {
    sim.load(makeProgram([0]));
    expect(sim.isHalted()).toBe(false);
  });

  it('step increments stepCount', async () => {
    sim.load(makeProgram([iType(0x09, 0, 8, 1)]));
    await sim.step();
    expect(sim.getState().stepCount).toBe(1);
  });

  it('reset restores initial state', async () => {
    sim.load(makeProgram([iType(0x09, 0, 8, 42)]));
    await sim.step();
    sim.reset();
    expect(sim.getState().registers[8]).toBe(0);
    expect(sim.getState().stepCount).toBe(0);
    expect(sim.getState().pc).toBe(TEXT_BASE);
  });
});

describe('$zero protection', () => {
  it('cannot write to $zero via addi', async () => {
    sim.load(makeProgram([iType(0x09, 0, 0, 42)]));
    await sim.step();
    expect(sim.getState().registers[0]).toBe(0);
  });

  it('$zero stays 0 after R-type write', async () => {
    sim.load(makeProgram([
      iType(0x09, 0, 8, 5),
      rType(0, 8, 0, 0, 0, 0x20), // add $zero, $t0, $zero
    ]));
    await sim.step(); await sim.step();
    expect(sim.getState().registers[0]).toBe(0);
  });
});

describe('Halt on syscall 10', () => {
  it('halts after exit syscall', async () => {
    let exited = false;
    const s = new Simulator(makeIO({ exit: () => { exited = true; } }));
    s.load(makeProgram([
      iType(0x09, 0, 2, 10),     // addiu $v0, $zero, 10
      rType(0, 0, 0, 0, 0, 0x0c), // syscall
    ]));
    await s.step();
    await s.step();
    expect(exited).toBe(true);
  });
});

describe('Runtime errors', () => {
  it('throws on unknown opcode', async () => {
    // opcode 0x3f is unknown
    const badInstr = (0x3f << 26) | 0;
    sim.load(makeProgram([badInstr]));
    await expect(sim.step()).rejects.toThrow('Unknown opcode');
  });

  it('throws on division by zero', async () => {
    sim.load(makeProgram([
      iType(0x09, 0, 8, 5),
      iType(0x09, 0, 9, 0),
      rType(0, 8, 9, 0, 0, 0x1a), // div $t0, $t1
    ]));
    await sim.step(); await sim.step();
    await expect(sim.step()).rejects.toThrow('Division by zero');
  });

  it('step after halt is a no-op', async () => {
    let exited = false;
    const s = new Simulator(makeIO({ exit: () => { exited = true; } }));
    s.load(makeProgram([
      iType(0x09, 0, 2, 10),
      rType(0, 0, 0, 0, 0, 0x0c),
    ]));
    await s.step(); await s.step();
    const stateBefore = s.getState().stepCount;
    await s.step();
    expect(s.getState().stepCount).toBe(stateBefore);
  });
});
