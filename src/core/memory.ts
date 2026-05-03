import { toUnsigned32 } from './registers';

export const TEXT_BASE  = 0x00400000;
export const DATA_BASE  = 0x10010000;
export const STACK_BASE = 0x7fffeffc;
export const MEM_SIZE   = 0x00800000;

export class Memory {
  private buf: ArrayBuffer;
  private view: DataView;
  // Phase 2D — when false (default), stores to addresses in the
  // .text segment throw. Real MARS rejects self-modifying code by
  // default; flipping this on lets advanced examples patch the
  // instruction stream at runtime. Program-loader writes go through
  // loadProgram() which bypasses the guard.
  private allowTextWrites: boolean = false;

  constructor() {
    this.buf = new ArrayBuffer(MEM_SIZE);
    this.view = new DataView(this.buf);
  }

  setAllowTextWrites(on: boolean): void {
    this.allowTextWrites = on;
  }

  private offset(addr: number): number {
    const a = toUnsigned32(addr);
    if (a >= TEXT_BASE && a < TEXT_BASE + 0x00100000) return a - TEXT_BASE;
    if (a >= DATA_BASE && a < DATA_BASE + 0x00100000) return 0x00100000 + (a - DATA_BASE);
    if (a >= 0x7ff00000) return 0x00200000 + (a - 0x7ff00000);
    throw new Error(`Memory access out of range: 0x${a.toString(16)}`);
  }

  private guardWrite(addr: number): void {
    const a = toUnsigned32(addr);
    if (this.allowTextWrites) return;
    if (a >= TEXT_BASE && a < TEXT_BASE + 0x00100000) {
      throw new Error(
        `Self-modifying code: store to .text at 0x${a.toString(16)}. ` +
        `Enable Settings → Simulator → "Self-modifying code allowed" to permit.`,
      );
    }
  }

  readWord(addr: number): number {
    if (addr & 3) throw new Error(`Unaligned word read at 0x${toUnsigned32(addr).toString(16)}`);
    return this.view.getInt32(this.offset(addr), false);
  }

  writeWord(addr: number, val: number): void {
    if (addr & 3) throw new Error(`Unaligned word write at 0x${toUnsigned32(addr).toString(16)}`);
    this.guardWrite(addr);
    this.view.setInt32(this.offset(addr), val, false);
  }

  readHalf(addr: number): number {
    if (addr & 1) throw new Error(`Unaligned halfword read at 0x${toUnsigned32(addr).toString(16)}`);
    return this.view.getInt16(this.offset(addr), false);
  }

  writeHalf(addr: number, val: number): void {
    if (addr & 1) throw new Error(`Unaligned halfword write`);
    this.guardWrite(addr);
    this.view.setInt16(this.offset(addr), val & 0xffff, false);
  }

  readByte(addr: number): number {
    return this.view.getInt8(this.offset(addr));
  }

  writeByte(addr: number, val: number): void {
    this.guardWrite(addr);
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
