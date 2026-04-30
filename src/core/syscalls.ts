import type { Memory } from './memory';

export interface SyscallIO {
  print: (s: string) => void;
  readInt: () => Promise<number>;
  readString: (maxLen: number) => Promise<string>;
  exit: () => void;
}

export function handleSyscall(
  code: number,
  registers: number[],
  memory: Memory,
  io: SyscallIO
): Promise<void> | void {
  switch (code) {
    case 1:
      io.print(String(registers[4] | 0)); // $a0
      break;
    case 4: {
      const addr = registers[4];
      let s = '';
      let i = 0;
      while (true) {
        const b = memory.readUnsignedByte(addr + i++);
        if (b === 0) break;
        s += String.fromCharCode(b);
        if (i > 10000) break;
      }
      io.print(s);
      break;
    }
    case 5:
      return io.readInt().then(val => { registers[2] = val | 0; });
    case 8: {
      const addr = registers[4];
      const maxLen = registers[5];
      return io.readString(maxLen).then(s => {
        const bytes = new TextEncoder().encode(s.slice(0, maxLen - 1));
        for (let i = 0; i < bytes.length; i++) memory.writeByte(addr + i, bytes[i]);
        memory.writeByte(addr + bytes.length, 0);
      });
    }
    case 10:
      io.exit();
      break;
    default:
      throw new Error(`Unsupported syscall code: ${code}`);
  }
}
