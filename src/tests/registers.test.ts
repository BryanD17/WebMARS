import { describe, it, expect } from 'vitest';
import { toSigned32, toUnsigned32, createRegisterFile, REGISTER_INDEX } from '../core/registers';

describe('toSigned32', () => {
  it('handles zero', () => expect(toSigned32(0)).toBe(0));
  it('handles positive', () => expect(toSigned32(42)).toBe(42));
  it('handles MAX_INT', () => expect(toSigned32(0x7fffffff)).toBe(2147483647));
  it('handles MIN_INT (wraps)', () => expect(toSigned32(0x80000000)).toBe(-2147483648));
  it('handles -1', () => expect(toSigned32(-1)).toBe(-1));
  it('handles overflow', () => expect(toSigned32(0x100000001)).toBe(1));
});

describe('toUnsigned32', () => {
  it('handles zero', () => expect(toUnsigned32(0)).toBe(0));
  it('handles -1 as max uint32', () => expect(toUnsigned32(-1)).toBe(4294967295));
  it('handles MIN_INT', () => expect(toUnsigned32(-2147483648)).toBe(2147483648));
  it('handles positive', () => expect(toUnsigned32(42)).toBe(42));
});

describe('createRegisterFile', () => {
  it('has 32 registers', () => expect(createRegisterFile()).toHaveLength(32));
  it('$zero is 0', () => expect(createRegisterFile()[0]).toBe(0));
  it('$sp is initialized', () => expect(createRegisterFile()[29]).toBe(0x7fffeffc));
  it('$gp is initialized', () => expect(createRegisterFile()[28]).toBe(0x10008000));
  it('all others are 0', () => {
    const regs = createRegisterFile();
    for (let i = 1; i < 28; i++) {
      if (i !== 28 && i !== 29) expect(regs[i]).toBe(0);
    }
  });
});

describe('REGISTER_INDEX', () => {
  it('maps $zero to 0', () => expect(REGISTER_INDEX['$zero']).toBe(0));
  it('maps $sp to 29', () => expect(REGISTER_INDEX['$sp']).toBe(29));
  it('maps $ra to 31', () => expect(REGISTER_INDEX['$ra']).toBe(31));
  it('maps $0 to 0', () => expect(REGISTER_INDEX['$0']).toBe(0));
  it('maps $31 to 31', () => expect(REGISTER_INDEX['$31']).toBe(31));
});
