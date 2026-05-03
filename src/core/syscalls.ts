import type { Memory } from './memory'

// MARS dialog syscall (54) message kinds. The numeric codes match
// real MARS: 0 = info, 1 = info, 2 = warning, 3 = error. We expose
// them by name for clarity; the syscall handler maps the integer.
export type DialogKind = 'info' | 'warn' | 'error' | 'question'

export interface SyscallIO {
  print: (s: string) => void
  readInt: () => Promise<number>
  readString: (maxLen: number) => Promise<string>
  exit: () => void

  // Phase 2E additions — optional so older test fixtures keep
  // working; handleSyscall throws "Unsupported" if a program
  // requests a syscall whose IO method isn't wired.
  readChar?:    () => Promise<string>
  confirm?:     (message: string) => Promise<0 | 1 | 2>   // Yes / No / Cancel
  alert?:       (message: string, kind: DialogKind) => Promise<void>

  // Phase 2H — input dialog syscalls. The result tuple wraps the
  // user's value alongside a `cancelled` flag so the engine can
  // pick the right MARS status code for $a1 (-3 = cancel, -2 =
  // invalid input, -4 = buffer too small).
  promptInt?:    (message: string) => Promise<{ value: number; cancelled: boolean; invalid?: boolean }>
  promptString?: (message: string) => Promise<{ value: string; cancelled: boolean }>
}

export function handleSyscall(
  code: number,
  registers: number[],
  memory: Memory,
  io: SyscallIO,
): Promise<void> | void {
  switch (code) {
    case 1:
      io.print(String((registers[4] ?? 0) | 0)) // $a0
      break
    case 4: {
      const addr = registers[4] ?? 0
      let s = ''
      let i = 0
      while (true) {
        const b = memory.readUnsignedByte(addr + i++)
        if (b === 0) break
        s += String.fromCharCode(b)
        if (i > 10000) break
      }
      io.print(s)
      break
    }
    case 5:
      return io.readInt().then((val) => {
        registers[2] = val | 0
      })
    case 8: {
      const addr = registers[4] ?? 0
      const maxLen = registers[5] ?? 0
      return io.readString(maxLen).then((s) => {
        const bytes = new TextEncoder().encode(s.slice(0, maxLen - 1))
        for (let i = 0; i < bytes.length; i++) memory.writeByte(addr + i, bytes[i] ?? 0)
        memory.writeByte(addr + bytes.length, 0)
      })
    }
    case 10:
      io.exit()
      break

    // ─ Phase 2E syscalls ─

    case 11: {
      // print char — codepoint (low 8 bits) in $a0
      const c = (registers[4] ?? 0) & 0xff
      io.print(String.fromCharCode(c))
      break
    }
    case 12: {
      // read char — first char of input goes into $v0 as int
      if (!io.readChar) throw new Error('Syscall 12 (read char) requires an io.readChar handler')
      return io.readChar().then((s) => {
        registers[2] = s.length > 0 ? s.charCodeAt(0) : 0
      })
    }
    case 30: {
      // system time — low 32 bits → $a0, high 32 bits → $a1
      const now = Date.now()
      registers[4] = (now & 0xffffffff) | 0
      registers[5] = Math.floor(now / 0x100000000) | 0
      break
    }
    case 32: {
      // sleep — millisecond duration in $a0. Returns once the sleep
      // resolves; the simulator's caller awaits the Promise so the
      // run loop pauses for real wall time.
      const ms = (registers[4] ?? 0) | 0
      return new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)))
    }
    case 41: {
      // random int (no range) — uniform 32-bit int in $a0. JS's
      // Math.random returns [0,1); scale to int32.
      registers[4] = Math.floor(Math.random() * 0x100000000) | 0
      break
    }
    case 42: {
      // random int with range — $a0 = id (ignored, real MARS uses
      // multi-stream RNG), $a1 = upper bound (exclusive). Result in
      // $a0 as 0..bound-1.
      const bound = (registers[5] ?? 0) | 0
      registers[4] = bound > 0 ? Math.floor(Math.random() * bound) | 0 : 0
      break
    }
    case 50: {
      // confirm dialog — prompt addr in $a0, response in $a0:
      // 0 = Yes, 1 = No, 2 = Cancel.
      if (!io.confirm) throw new Error('Syscall 50 (confirm dialog) requires an io.confirm handler')
      const msg = readCStr(memory, registers[4] ?? 0)
      return io.confirm(msg).then((result) => {
        registers[4] = result
      })
    }
    case 51: {
      // input int dialog. $a0 = prompt addr. Returns int in $a0;
      // $a1 = 0 on success, -2 on invalid input, -3 on cancel.
      if (!io.promptInt) throw new Error('Syscall 51 (input int dialog) requires an io.promptInt handler')
      const msg = readCStr(memory, registers[4] ?? 0)
      return io.promptInt(msg).then((result) => {
        if (result.cancelled) {
          registers[4] = 0
          registers[5] = -3
        } else if (result.invalid) {
          registers[4] = 0
          registers[5] = -2
        } else {
          registers[4] = result.value | 0
          registers[5] = 0
        }
      })
    }
    case 53: {
      // input string dialog. $a0 = prompt addr, $a1 = buffer addr,
      // $a2 = max byte count (incl. NUL). $a1 = 0 on success,
      // -3 on cancel, -4 if buffer too small (truncated).
      if (!io.promptString) throw new Error('Syscall 53 (input string dialog) requires an io.promptString handler')
      const msg = readCStr(memory, registers[4] ?? 0)
      const bufAddr = registers[5] ?? 0
      const maxLen  = (registers[6] ?? 0) | 0
      return io.promptString(msg).then((result) => {
        if (result.cancelled) {
          registers[5] = -3
          return
        }
        const encoded = new TextEncoder().encode(result.value)
        const truncated = encoded.length > maxLen - 1
        const writeLen = Math.min(encoded.length, Math.max(0, maxLen - 1))
        for (let i = 0; i < writeLen; i++) memory.writeByte(bufAddr + i, encoded[i] ?? 0)
        memory.writeByte(bufAddr + writeLen, 0)
        registers[5] = truncated ? -4 : 0
      })
    }
    case 54: {
      // message dialog — prompt addr in $a0, message-kind code in
      // $a1 (0/1 = info, 2 = warning, 3 = error).
      if (!io.alert) throw new Error('Syscall 54 (message dialog) requires an io.alert handler')
      const msg = readCStr(memory, registers[4] ?? 0)
      const code = (registers[5] ?? 0) | 0
      const kind: DialogKind =
        code === 2 ? 'warn'
        : code === 3 ? 'error'
        : code === 4 ? 'question'
        : 'info'
      return io.alert(msg, kind)
    }

    default:
      throw new Error(`Unsupported syscall code: ${code}`)
  }
}

// Read a NUL-terminated ASCII string from memory. Used by syscalls
// 4 (print string), 50 (confirm), 54 (alert). Capped at 10k bytes
// to bound runaway reads on uninitialized memory.
function readCStr(memory: Memory, addr: number): string {
  let s = ''
  for (let i = 0; i < 10000; i++) {
    const b = memory.readUnsignedByte(addr + i)
    if (b === 0) break
    s += String.fromCharCode(b)
  }
  return s
}
