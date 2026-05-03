import { describe, it, expect, beforeEach } from 'vitest';
import { Memory, TEXT_BASE, DATA_BASE } from '../core/memory';

let mem: Memory;
beforeEach(() => {
  mem = new Memory();
  // These unit tests exercise read/write mechanics by writing to
  // TEXT_BASE (a known-mapped address); they pre-date Phase 2D's
  // self-modifying-code guard, so opt in to text writes here so the
  // mechanics stay verifiable. Phase 2D's policy is exercised by
  // selfModifyingCode.test.ts.
  mem.setAllowTextWrites(true);
});

describe('Memory readWord/writeWord', () => {
  it('writes and reads at TEXT_BASE', () => {
    mem.writeWord(TEXT_BASE, 0xdeadbeef | 0);
    expect(mem.readWord(TEXT_BASE)).toBe(0xdeadbeef | 0);
  });
  it('writes and reads at DATA_BASE', () => {
    mem.writeWord(DATA_BASE, 12345);
    expect(mem.readWord(DATA_BASE)).toBe(12345);
  });
  it('throws on unaligned word read', () => {
    expect(() => mem.readWord(TEXT_BASE + 1)).toThrow('Unaligned');
  });
  it('throws on unaligned word write', () => {
    expect(() => mem.writeWord(TEXT_BASE + 2, 0)).toThrow('Unaligned');
  });
  it('throws on out-of-range address', () => {
    expect(() => mem.readWord(0x00000000)).toThrow('out of range');
  });
});

describe('Memory readByte/writeByte', () => {
  it('writes and reads a byte', () => {
    mem.writeByte(TEXT_BASE, 0x42);
    expect(mem.readByte(TEXT_BASE)).toBe(0x42);
  });
  it('readUnsignedByte treats 0xff as 255', () => {
    mem.writeByte(TEXT_BASE, 0xff);
    expect(mem.readUnsignedByte(TEXT_BASE)).toBe(255);
  });
});

describe('Memory readHalf/writeHalf', () => {
  it('writes and reads a halfword', () => {
    mem.writeHalf(TEXT_BASE, 0x1234);
    expect(mem.readHalf(TEXT_BASE)).toBe(0x1234);
  });
  it('readUnsignedHalf treats 0x8000 as positive', () => {
    mem.writeHalf(TEXT_BASE, 0x8000);
    expect(mem.readUnsignedHalf(TEXT_BASE)).toBe(0x8000);
  });
  it('throws on unaligned halfword', () => {
    expect(() => mem.readHalf(TEXT_BASE + 1)).toThrow('Unaligned');
  });
});

describe('Memory loadProgram', () => {
  it('places instructions at TEXT_BASE', () => {
    mem.loadProgram([0x12345678, 0xabcdef00], new Uint8Array(0));
    expect(mem.readWord(TEXT_BASE)).toBe(0x12345678);
    expect(mem.readWord(TEXT_BASE + 4)).toBe(0xabcdef00 | 0);
  });
  it('places data at DATA_BASE', () => {
    mem.loadProgram([], new Uint8Array([0xaa, 0xbb]));
    expect(mem.readUnsignedByte(DATA_BASE)).toBe(0xaa);
    expect(mem.readUnsignedByte(DATA_BASE + 1)).toBe(0xbb);
  });
});
