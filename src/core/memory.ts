import { toUnsigned32 } from './registers';

export const TEXT_BASE  = 0x00400000;
export const DATA_BASE  = 0x10010000;
export const STACK_BASE = 0x7fffeffc;
export const MEM_SIZE   = 0x00800000;

export class Memory {
  private buf: ArrayBuffer;
  private view: DataView;

  constructor() {
    this.buf = new ArrayBuffer(MEM_SIZE);
    this.view = new DataView(this.buf);
  }

  private offset(addr: number): number {
    const a = toUnsigned32(addr);
    if (a >= TEXT_BASE && a < TEXT_BASE + 0x00100000) return a - TEXT_BASE;
    if (a >= DATA_BASE && a < DATA_BASE + 0x00100000) return 0x00100000 + (a - DATA_BASE);
    if (a >= 0x7ff00000) return 0x00200000 + (a - 0x7ff00000);
    throw new Error(`Memory access out of range: 0x${a.toString(16)}`);
  }

  readWord(addr: number): number {
    if (addr & 3) throw new Error(`Unaligned word read at 0x${toUnsigned32(addr).toString(16)}`);
    return this.view.getInt32(this.offset(addr), false);
  }

  writeWord(addr: number, val: number): void {
    if (addr & 3) throw new Error(`Unaligned word write at 0x${toUnsigned32(addr).toString(16)}`);
    this.view.setInt32(this.offset(addr), val, false);
  }

  readHalf(addr: number): number {
    if (addr & 1) throw new Error(`Unaligned halfword read at 0x${toUnsigned32(addr).toString(16)}`);
    return this.view.getInt16(this.offset(addr), false);
  }

  writeHalf(addr: number, val: number): void {
    if (addr & 1) throw new Error(`Unaligned halfword write`);
    this.view.setInt16(this.offset(addr), val & 0xffff, false);
  }

  readByte(addr: number): number {
    return this.view.getInt8(this.offset(addr));
  }

  writeByte(addr: number, val: number): void {
    this.view.setInt8(this.offset(addr), val & 0xff);
  }

  readUnsignedByte(addr: number): number {
    return this.view.getUint8(this.offset(addr));
  }

  readUnsignedHalf(addr: number): number {
    if (addr & 1) throw new Error(`Unaligned halfword read`);
    return this.view.getUint16(this.offset(addr), false);
  }

  loadProgram(instructions: number[], dataBytes: Uint8Array): void {
    for (let i = 0; i < instructions.length; i++) {
      this.view.setInt32(this.offset(TEXT_BASE + i * 4), instructions[i] ?? 0, false);
    }
    for (let i = 0; i < dataBytes.length; i++) {
      this.view.setUint8(this.offset(DATA_BASE + i), dataBytes[i] ?? 0);
    }
  }

  readBytes(addr: number, count: number): Uint8Array {
    const out = new Uint8Array(count);
    for (let i = 0; i < count; i++) out[i] = this.view.getUint8(this.offset(addr + i));
    return out;
  }

  dump(addr: number, words: number): { addr: number; word: number }[] {
    const result = [];
    for (let i = 0; i < words; i++) {
      try {
        result.push({ addr: addr + i * 4, word: this.readWord(addr + i * 4) });
      } catch { break; }
    }
    return result;
  }
}
