import { createRegisterFile, toSigned32, toUnsigned32 } from './registers';
import { Memory, TEXT_BASE } from './memory';
import { handleSyscall, SyscallIO } from './syscalls';
import type { AssembledProgram, SimulatorState } from './types';

export class Simulator {
  private regs: number[];
  private hi: number = 0;
  private lo: number = 0;
  private pc: number = TEXT_BASE;
  private memory: Memory;
  private program: AssembledProgram | null = null;
  private halted: boolean = false;
  private stepCount: number = 0;
  private lastChanged: Set<number> = new Set();
  private io: SyscallIO;

  constructor(io: SyscallIO) {
    this.regs = createRegisterFile();
    this.memory = new Memory();
    this.io = io;
  }

  load(program: AssembledProgram): void {
    this.regs = createRegisterFile();
    this.hi = 0;
    this.lo = 0;
    this.pc = TEXT_BASE;
    this.halted = false;
    this.stepCount = 0;
    this.lastChanged = new Set();
    this.memory = new Memory();
    this.memory.loadProgram(program.instructions, program.dataSegment);
    this.program = program;
  }

  reset(): void {
    if (this.program) this.load(this.program);
  }

  getState(): SimulatorState {
    return {
      registers: [...this.regs],
      hi: this.hi,
      lo: this.lo,
      pc: this.pc,
      memory: new Uint8Array(0),
      running: false,
      halted: this.halted,
      stepCount: this.stepCount,
      consoleOutput: '',
      consoleInputBuffer: '',
      lastChangedRegisters: new Set(this.lastChanged),
      error: null,
    };
  }

  getCurrentLine(): number | null {
    return this.program?.sourceMap.get(this.pc) ?? null;
  }

  isHalted(): boolean {
    return this.halted;
  }

  memoryDump(addr: number, words: number) {
    return this.memory.dump(addr, words);
  }

  async step(): Promise<void> {
    if (this.halted) return;
    this.lastChanged = new Set();
    const instr = this.memory.readWord(this.pc);
    this.pc += 4;
    await this.execute(instr);
    this.stepCount++;
    this.regs[0] = 0;
  }

  async run(maxSteps = 1_000_000): Promise<void> {
    for (let i = 0; i < maxSteps && !this.halted; i++) {
      await this.step();
    }
    if (!this.halted) throw new Error('Maximum step count exceeded — possible infinite loop');
  }

  private setReg(idx: number, val: number): void {
    if (idx === 0) return;
    this.regs[idx] = toSigned32(val);
    this.lastChanged.add(idx);
  }

  private async execute(instr: number): Promise<void> {
    const op     = (instr >>> 26) & 0x3f;
    const rs     = (instr >>> 21) & 0x1f;
    const rt     = (instr >>> 16) & 0x1f;
    const rd     = (instr >>> 11) & 0x1f;
    const shamt  = (instr >>> 6)  & 0x1f;
    const funct  = instr & 0x3f;
    const imm16s = (instr << 16) >> 16;
    const imm16u = instr & 0xffff;
    const target = instr & 0x3ffffff;

    if (op === 0) {
      switch (funct) {
        case 0x20: this.setReg(rd, this.regs[rs] + this.regs[rt]); break;
        case 0x21: this.setReg(rd, toUnsigned32(this.regs[rs]) + toUnsigned32(this.regs[rt])); break;
        case 0x22: this.setReg(rd, this.regs[rs] - this.regs[rt]); break;
        case 0x23: this.setReg(rd, toUnsigned32(this.regs[rs]) - toUnsigned32(this.regs[rt])); break;
        case 0x24: this.setReg(rd, this.regs[rs] & this.regs[rt]); break;
        case 0x25: this.setReg(rd, this.regs[rs] | this.regs[rt]); break;
        case 0x26: this.setReg(rd, this.regs[rs] ^ this.regs[rt]); break;
        case 0x27: this.setReg(rd, ~(this.regs[rs] | this.regs[rt])); break;
        case 0x2a: this.setReg(rd, toSigned32(this.regs[rs]) < toSigned32(this.regs[rt]) ? 1 : 0); break;
        case 0x2b: this.setReg(rd, toUnsigned32(this.regs[rs]) < toUnsigned32(this.regs[rt]) ? 1 : 0); break;
        case 0x00: this.setReg(rd, this.regs[rt] << shamt); break;
        case 0x02: this.setReg(rd, this.regs[rt] >>> shamt); break;
        case 0x03: this.setReg(rd, this.regs[rt] >> shamt); break;
        case 0x04: this.setReg(rd, this.regs[rt] << (this.regs[rs] & 0x1f)); break;
        case 0x06: this.setReg(rd, this.regs[rt] >>> (this.regs[rs] & 0x1f)); break;
        case 0x07: this.setReg(rd, this.regs[rt] >> (this.regs[rs] & 0x1f)); break;
        case 0x18: {
          const result = BigInt(toSigned32(this.regs[rs])) * BigInt(toSigned32(this.regs[rt]));
          this.lo = Number(BigInt.asIntN(32, result & 0xFFFFFFFFn));
          this.hi = Number(BigInt.asIntN(32, result >> 32n));
          break;
        }
        case 0x19: {
          const result = BigInt(toUnsigned32(this.regs[rs])) * BigInt(toUnsigned32(this.regs[rt]));
          this.lo = Number(result & 0xFFFFFFFFn);
          this.hi = Number(result >> 32n);
          break;
        }
        case 0x1a: {
          if (this.regs[rt] === 0) throw new Error('Division by zero');
          this.lo = toSigned32(this.regs[rs]) / toSigned32(this.regs[rt]) | 0;
          this.hi = toSigned32(this.regs[rs]) % toSigned32(this.regs[rt]) | 0;
          break;
        }
        case 0x1b: {
          const a = toUnsigned32(this.regs[rs]), b = toUnsigned32(this.regs[rt]);
          if (b === 0) throw new Error('Division by zero');
          this.lo = (a / b) | 0;
          this.hi = (a % b) | 0;
          break;
        }
        case 0x10: this.setReg(rd, this.hi); break;
        case 0x12: this.setReg(rd, this.lo); break;
        case 0x11: this.hi = this.regs[rs]; break;
        case 0x13: this.lo = this.regs[rs]; break;
        case 0x08: this.pc = toUnsigned32(this.regs[rs]); break;
        case 0x09:
          this.setReg(rd === 0 ? 31 : rd, this.pc);
          this.pc = toUnsigned32(this.regs[rs]);
          break;
        case 0x0c: {
          const syscallCode = this.regs[2];
          await handleSyscall(syscallCode, this.regs, this.memory, this.io);
          if (syscallCode === 10) this.halted = true;
          break;
        }
        default:
          throw new Error(`Unknown R-type funct: 0x${funct.toString(16)}`);
      }
    } else if (op === 0x02) {
      this.pc = ((this.pc & 0xf0000000) | (target << 2));
    } else if (op === 0x03) {
      this.setReg(31, this.pc);
      this.pc = ((this.pc & 0xf0000000) | (target << 2));
    } else {
      switch (op) {
        case 0x08: this.setReg(rt, this.regs[rs] + imm16s); break;
        case 0x09: this.setReg(rt, toUnsigned32(this.regs[rs]) + imm16u); break;
        case 0x0c: this.setReg(rt, this.regs[rs] & imm16u); break;
        case 0x0d: this.setReg(rt, this.regs[rs] | imm16u); break;
        case 0x0e: this.setReg(rt, this.regs[rs] ^ imm16u); break;
        case 0x0a: this.setReg(rt, toSigned32(this.regs[rs]) < imm16s ? 1 : 0); break;
        case 0x0b: this.setReg(rt, toUnsigned32(this.regs[rs]) < imm16u ? 1 : 0); break;
        case 0x0f: this.setReg(rt, imm16u << 16); break;
        case 0x23: this.setReg(rt, this.memory.readWord(this.regs[rs] + imm16s)); break;
        case 0x21: this.setReg(rt, this.memory.readHalf(this.regs[rs] + imm16s)); break;
        case 0x25: this.setReg(rt, this.memory.readUnsignedHalf(this.regs[rs] + imm16s)); break;
        case 0x20: this.setReg(rt, this.memory.readByte(this.regs[rs] + imm16s)); break;
        case 0x24: this.setReg(rt, this.memory.readUnsignedByte(this.regs[rs] + imm16s)); break;
        case 0x2b: this.memory.writeWord(this.regs[rs] + imm16s, this.regs[rt]); break;
        case 0x29: this.memory.writeHalf(this.regs[rs] + imm16s, this.regs[rt]); break;
        case 0x28: this.memory.writeByte(this.regs[rs] + imm16s, this.regs[rt]); break;
        case 0x04: if (this.regs[rs] === this.regs[rt]) this.pc += imm16s * 4 - 4; break;
        case 0x05: if (this.regs[rs] !== this.regs[rt]) this.pc += imm16s * 4 - 4; break;
        case 0x07: if (toSigned32(this.regs[rs]) > 0) this.pc += imm16s * 4 - 4; break;
        case 0x06: if (toSigned32(this.regs[rs]) <= 0) this.pc += imm16s * 4 - 4; break;
        case 0x01:
          if (rt === 0 && toSigned32(this.regs[rs]) < 0) this.pc += imm16s * 4 - 4;
          if (rt === 1 && toSigned32(this.regs[rs]) >= 0) this.pc += imm16s * 4 - 4;
          break;
        default:
          throw new Error(`Unknown opcode: 0x${op.toString(16)}`);
      }
    }
  }
}
