import {
  createRegisterFile,
  createFpuRegisterFile,
  bitsToFloat,
  floatToBits,
  toSigned32,
  toUnsigned32,
} from './registers'
import { Memory, TEXT_BASE } from './memory'
import { handleSyscall, type SyscallIO } from './syscalls'
import type { AssembledProgram } from './types'

export class Simulator {
  private regs: number[]
  private hi: number = 0
  private lo: number = 0
  private pc: number = TEXT_BASE
  private memory: Memory
  private program: AssembledProgram | null = null
  private halted: boolean = false
  private stepCount: number = 0
  private lastChanged: Set<number> = new Set()
  // ─ coprocessor 1 (FPU) ─
  // Single-precision register bits + the FCSR cc[0] bit set by c.cond.s.
  private fpRegs: number[]
  private fpCondFlag: boolean = false
  private lastChangedFp: Set<number> = new Set()
  // ─ delayed branching (Phase 2C) ─
  // When on, branch / jump targets aren't applied immediately —
  // they're queued in pendingBranchTarget and committed at the end
  // of the FOLLOWING step, so the delay slot instruction executes
  // first (real MIPS semantics). Off by default — most courses
  // teach without delay slots and the existing examples assume that.
  private delayedBranching: boolean = false
  private pendingBranchTarget: number | null = null
  private io: SyscallIO

  constructor(io: SyscallIO) {
    this.regs = createRegisterFile()
    this.fpRegs = createFpuRegisterFile()
    this.memory = new Memory()
    this.io = io
  }

  load(program: AssembledProgram): void {
    this.regs = createRegisterFile()
    this.fpRegs = createFpuRegisterFile()
    this.fpCondFlag = false
    this.hi = 0
    this.lo = 0
    this.pc = TEXT_BASE
    this.halted = false
    this.stepCount = 0
    this.lastChanged = new Set()
    this.lastChangedFp = new Set()
    this.pendingBranchTarget = null
    this.memory = new Memory()
    this.memory.loadProgram(program.instructions, program.dataSegment)
    this.program = program
  }

  setDelayedBranching(on: boolean): void {
    this.delayedBranching = on
    // Discard any in-flight pending branch when the flag flips —
    // mid-program toggles otherwise leave a stale target queued
    // against semantics the user just opted out of.
    if (!on) this.pendingBranchTarget = null
  }

  // Branch/jump dispatch. Called from execute(); routes through
  // pendingBranchTarget when delayed branching is on so the next
  // step()'s instruction (the delay slot) runs before the target
  // is applied.
  private setBranchTarget(target: number): void {
    const t = target >>> 0
    if (this.delayedBranching) this.pendingBranchTarget = t
    else this.pc = t
  }

  reset(): void {
    if (this.program) this.load(this.program)
  }

  getState(): { registers: number[]; hi: number; lo: number; pc: number; stepCount: number; lastChangedRegisters: Set<number> } {
    return {
      registers: [...this.regs],
      hi: this.hi,
      lo: this.lo,
      pc: this.pc,
      stepCount: this.stepCount,
      lastChangedRegisters: new Set(this.lastChanged),
    }
  }

  // FPU snapshot — separate from getState() so the existing contract
  // (RegisterSnapshot) doesn't expand. The store reads this only when
  // the FPU panel is mounted (gated by simSettings.coproc01Panels).
  getFpuState(): { fpRegisters: number[]; condFlag: boolean; lastChangedFpRegisters: Set<number> } {
    return {
      fpRegisters: [...this.fpRegs],
      condFlag: this.fpCondFlag,
      lastChangedFpRegisters: new Set(this.lastChangedFp),
    }
  }

  // Reinterpret-cast helpers used by the cop1 instruction decoder.
  // Setting an FP register clears the lastChanged GPR set so the
  // register table flash works for FPU writes too.
  private fr(idx: number): number {
    return this.fpRegs[idx] ?? 0
  }

  private setFpReg(idx: number, bits: number): void {
    if (idx < 0 || idx > 31) return
    this.fpRegs[idx] = bits | 0
    this.lastChangedFp.add(idx)
  }

  private fpSingle(idx: number): number {
    return bitsToFloat(this.fr(idx))
  }

  private setFpSingle(idx: number, value: number): void {
    this.setFpReg(idx, floatToBits(value))
  }

  getCurrentLine(): number | null {
    return this.program?.sourceMap.get(this.pc) ?? null
  }

  isHalted(): boolean {
    return this.halted
  }

  memoryDump(addr: number, words: number) {
    return this.memory.dump(addr, words)
  }

  async step(): Promise<void> {
    if (this.halted) return
    this.lastChanged = new Set()
    this.lastChangedFp = new Set()

    // Snapshot the pending branch BEFORE execute. If a branch fired
    // last step, this step's instruction is its delay slot — execute
    // first, then commit the target. Done in this order so that
    // arithmetic / memory side-effects of the delay slot land before
    // the PC jumps; if the delay slot is itself a branch, its target
    // overwrites pendingBranchTarget for the NEXT cycle.
    const pendingFromPriorStep = this.pendingBranchTarget
    this.pendingBranchTarget = null

    const instr = this.memory.readWord(this.pc)
    this.pc += 4
    await this.execute(instr)

    if (pendingFromPriorStep !== null) {
      this.pc = pendingFromPriorStep
    }

    this.stepCount++
    this.regs[0] = 0
  }

  async run(maxSteps = 1_000_000): Promise<void> {
    for (let i = 0; i < maxSteps && !this.halted; i++) {
      await this.step()
    }
    if (!this.halted) throw new Error('Maximum step count exceeded — possible infinite loop')
  }

  private r(idx: number): number {
    return this.regs[idx] ?? 0
  }

  private setReg(idx: number, val: number): void {
    if (idx === 0) return
    this.regs[idx] = toSigned32(val)
    this.lastChanged.add(idx)
  }

  private async execute(instr: number): Promise<void> {
    const op     = (instr >>> 26) & 0x3f
    const rs     = (instr >>> 21) & 0x1f
    const rt     = (instr >>> 16) & 0x1f
    const rd     = (instr >>> 11) & 0x1f
    const shamt  = (instr >>> 6)  & 0x1f
    const funct  = instr & 0x3f
    const imm16s = (instr << 16) >> 16
    const imm16u = instr & 0xffff
    const target = instr & 0x3ffffff

    if (op === 0) {
      switch (funct) {
        case 0x20: this.setReg(rd, this.r(rs) + this.r(rt)); break
        case 0x21: this.setReg(rd, toUnsigned32(this.r(rs)) + toUnsigned32(this.r(rt))); break
        case 0x22: this.setReg(rd, this.r(rs) - this.r(rt)); break
        case 0x23: this.setReg(rd, toUnsigned32(this.r(rs)) - toUnsigned32(this.r(rt))); break
        case 0x24: this.setReg(rd, this.r(rs) & this.r(rt)); break
        case 0x25: this.setReg(rd, this.r(rs) | this.r(rt)); break
        case 0x26: this.setReg(rd, this.r(rs) ^ this.r(rt)); break
        case 0x27: this.setReg(rd, ~(this.r(rs) | this.r(rt))); break
        case 0x2a: this.setReg(rd, toSigned32(this.r(rs)) < toSigned32(this.r(rt)) ? 1 : 0); break
        case 0x2b: this.setReg(rd, toUnsigned32(this.r(rs)) < toUnsigned32(this.r(rt)) ? 1 : 0); break
        case 0x00: this.setReg(rd, this.r(rt) << shamt); break
        case 0x02: this.setReg(rd, this.r(rt) >>> shamt); break
        case 0x03: this.setReg(rd, this.r(rt) >> shamt); break
        case 0x04: this.setReg(rd, this.r(rt) << (this.r(rs) & 0x1f)); break
        case 0x06: this.setReg(rd, this.r(rt) >>> (this.r(rs) & 0x1f)); break
        case 0x07: this.setReg(rd, this.r(rt) >> (this.r(rs) & 0x1f)); break
        case 0x18: {
          const result = BigInt(toSigned32(this.r(rs))) * BigInt(toSigned32(this.r(rt)))
          this.lo = Number(BigInt.asIntN(32, result & 0xFFFFFFFFn))
          this.hi = Number(BigInt.asIntN(32, result >> 32n))
          break
        }
        case 0x19: {
          const result = BigInt(toUnsigned32(this.r(rs))) * BigInt(toUnsigned32(this.r(rt)))
          this.lo = Number(result & 0xFFFFFFFFn)
          this.hi = Number(result >> 32n)
          break
        }
        case 0x1a: {
          if (this.r(rt) === 0) throw new Error('Division by zero')
          this.lo = toSigned32(this.r(rs)) / toSigned32(this.r(rt)) | 0
          this.hi = toSigned32(this.r(rs)) % toSigned32(this.r(rt)) | 0
          break
        }
        case 0x1b: {
          const a = toUnsigned32(this.r(rs)), b = toUnsigned32(this.r(rt))
          if (b === 0) throw new Error('Division by zero')
          this.lo = (a / b) | 0
          this.hi = (a % b) | 0
          break
        }
        case 0x10: this.setReg(rd, this.hi); break
        case 0x12: this.setReg(rd, this.lo); break
        case 0x11: this.hi = this.r(rs); break
        case 0x13: this.lo = this.r(rs); break
        case 0x08: this.setBranchTarget(toUnsigned32(this.r(rs))); break
        case 0x09:
          // jalr — link register holds the return address. With
          // delayed branching on, the delay slot will execute next,
          // so $ra should point past it (PC+4 of the caller frame).
          this.setReg(rd === 0 ? 31 : rd, this.delayedBranching ? this.pc + 4 : this.pc)
          this.setBranchTarget(toUnsigned32(this.r(rs)))
          break
        case 0x0c: {
          const syscallCode = this.r(2)
          await handleSyscall(syscallCode, this.regs, this.memory, this.io)
          if (syscallCode === 10) this.halted = true
          break
        }
        default:
          throw new Error(`Unknown R-type funct: 0x${funct.toString(16)}`)
      }
    } else if (op === 0x02) {
      this.setBranchTarget((this.pc & 0xf0000000) | (target << 2))
    } else if (op === 0x03) {
      this.setReg(31, this.delayedBranching ? this.pc + 4 : this.pc)
      this.setBranchTarget((this.pc & 0xf0000000) | (target << 2))
    } else if (op === 0x11) {
      // ─ coprocessor 1 (FPU) ─
      // Layout: bits 25:21 = fmt (or sub-op for mtc1/mfc1/bc1),
      // 20:16 = ft, 15:11 = fs, 10:6 = fd, 5:0 = funct.
      const fmt = (instr >>> 21) & 0x1f
      const ft  = (instr >>> 16) & 0x1f
      const fs  = (instr >>> 11) & 0x1f
      const fd  = (instr >>> 6)  & 0x1f
      // bc1 uses imm16s (relative branch in instruction-count units).
      if (fmt === 0x08) {
        // BC1F (rt&1==0) / BC1T (rt&1==1). Real MIPS encodes the
        // condition code in bits 20:18; we only support cc=0.
        const takeIfTrue = (ft & 0x01) === 1
        const taken = takeIfTrue ? this.fpCondFlag : !this.fpCondFlag
        if (taken) this.setBranchTarget(this.pc + imm16s * 4 - 4)
      } else if (fmt === 0x00) {
        // MFC1 — move FP word to GPR. rt = bits of fs as a sign-
        // extended 32-bit integer.
        this.setReg(ft, toSigned32(this.fr(fs)))
      } else if (fmt === 0x04) {
        // MTC1 — move GPR word to FP. fs ← bits(rt).
        this.setFpReg(fs, this.r(ft))
      } else if (fmt === 0x10) {
        // FMT_S — single-precision arithmetic + comparison.
        switch (funct) {
          case 0x00: this.setFpSingle(fd, this.fpSingle(fs) + this.fpSingle(ft)); break  // add.s
          case 0x01: this.setFpSingle(fd, this.fpSingle(fs) - this.fpSingle(ft)); break  // sub.s
          case 0x02: this.setFpSingle(fd, this.fpSingle(fs) * this.fpSingle(ft)); break  // mul.s
          case 0x03: this.setFpSingle(fd, this.fpSingle(fs) / this.fpSingle(ft)); break  // div.s
          case 0x04: this.setFpSingle(fd, Math.sqrt(this.fpSingle(fs))); break             // sqrt.s
          case 0x05: this.setFpSingle(fd, Math.abs(this.fpSingle(fs))); break              // abs.s
          case 0x06: this.setFpReg(fd, this.fr(fs)); break                                  // mov.s
          case 0x07: this.setFpSingle(fd, -this.fpSingle(fs)); break                        // neg.s
          case 0x24: this.setFpReg(fd, toSigned32(Math.trunc(this.fpSingle(fs)))); break    // cvt.w.s
          case 0x32: this.fpCondFlag = this.fpSingle(fs) === this.fpSingle(ft); break       // c.eq.s
          case 0x3c: this.fpCondFlag = this.fpSingle(fs) <  this.fpSingle(ft); break        // c.lt.s
          case 0x3e: this.fpCondFlag = this.fpSingle(fs) <= this.fpSingle(ft); break        // c.le.s
          default:
            throw new Error(`Unknown cop1 fmt.s funct: 0x${funct.toString(16)}`)
        }
      } else if (fmt === 0x14) {
        // FMT_W — integer-formatted FP register. Only conversion to
        // single-precision is supported (cvt.s.w).
        switch (funct) {
          case 0x20: this.setFpSingle(fd, toSigned32(this.fr(fs))); break  // cvt.s.w
          default:
            throw new Error(`Unknown cop1 fmt.w funct: 0x${funct.toString(16)}`)
        }
      } else {
        throw new Error(`Unknown cop1 fmt: 0x${fmt.toString(16)}`)
      }
    } else {
      switch (op) {
        case 0x08: this.setReg(rt, this.r(rs) + imm16s); break
        case 0x09: this.setReg(rt, toUnsigned32(this.r(rs)) + imm16u); break
        case 0x0c: this.setReg(rt, this.r(rs) & imm16u); break
        case 0x0d: this.setReg(rt, this.r(rs) | imm16u); break
        case 0x0e: this.setReg(rt, this.r(rs) ^ imm16u); break
        case 0x0a: this.setReg(rt, toSigned32(this.r(rs)) < imm16s ? 1 : 0); break
        case 0x0b: this.setReg(rt, toUnsigned32(this.r(rs)) < imm16u ? 1 : 0); break
        case 0x0f: this.setReg(rt, imm16u << 16); break
        case 0x23: this.setReg(rt, this.memory.readWord(this.r(rs) + imm16s)); break
        case 0x21: this.setReg(rt, this.memory.readHalf(this.r(rs) + imm16s)); break
        case 0x25: this.setReg(rt, this.memory.readUnsignedHalf(this.r(rs) + imm16s)); break
        case 0x20: this.setReg(rt, this.memory.readByte(this.r(rs) + imm16s)); break
        case 0x24: this.setReg(rt, this.memory.readUnsignedByte(this.r(rs) + imm16s)); break
        case 0x2b: this.memory.writeWord(this.r(rs) + imm16s, this.r(rt)); break
        case 0x29: this.memory.writeHalf(this.r(rs) + imm16s, this.r(rt)); break
        case 0x28: this.memory.writeByte(this.r(rs) + imm16s, this.r(rt)); break
        case 0x31: this.setFpReg(rt, this.memory.readWord(this.r(rs) + imm16s)); break    // lwc1 — fpr[rt] = MEM[rs+off]
        case 0x39: this.memory.writeWord(this.r(rs) + imm16s, this.fr(rt)); break          // swc1 — MEM[rs+off] = fpr[rt]
        case 0x04: if (this.r(rs) === this.r(rt))      this.setBranchTarget(this.pc + imm16s * 4 - 4); break
        case 0x05: if (this.r(rs) !== this.r(rt))      this.setBranchTarget(this.pc + imm16s * 4 - 4); break
        case 0x07: if (toSigned32(this.r(rs)) >  0)    this.setBranchTarget(this.pc + imm16s * 4 - 4); break
        case 0x06: if (toSigned32(this.r(rs)) <= 0)    this.setBranchTarget(this.pc + imm16s * 4 - 4); break
        case 0x01:
          if (rt === 0 && toSigned32(this.r(rs)) <  0) this.setBranchTarget(this.pc + imm16s * 4 - 4)
          if (rt === 1 && toSigned32(this.r(rs)) >= 0) this.setBranchTarget(this.pc + imm16s * 4 - 4)
          break
        default:
          throw new Error(`Unknown opcode: 0x${op.toString(16)}`)
      }
    }
  }
}
