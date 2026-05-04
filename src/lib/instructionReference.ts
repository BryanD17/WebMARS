// Single source of truth for the MIPS instruction reference. Consumed
// by the Monaco hover provider in mipsLanguage.ts AND the HelpDialog
// in src/ui/HelpDialog.tsx.
//
// Phase 3 SA-6 introduced the categorized entry shape so the
// HelpDialog can render per-category tables without re-deriving
// metadata from the mnemonic name.

export type InstructionCategory =
  | 'arithmetic'
  | 'logical'
  | 'shift'
  | 'memory'
  | 'branch'
  | 'jump'
  | 'multiply-divide'
  | 'comparison'
  | 'syscall'
  | 'fpu'
  | 'trap'
  | 'pseudo'

export interface InstructionEntry {
  mnemonic: string
  category: InstructionCategory
  format: string
  description: string
}

export const INSTRUCTION_ENTRIES: ReadonlyArray<InstructionEntry> = [
  // R-type arithmetic
  { mnemonic: 'add',   category: 'arithmetic', format: 'add $rd, $rs, $rt',  description: 'Add (with overflow). $rd = $rs + $rt.' },
  { mnemonic: 'addu',  category: 'arithmetic', format: 'addu $rd, $rs, $rt', description: 'Add unsigned (no overflow trap).' },
  { mnemonic: 'sub',   category: 'arithmetic', format: 'sub $rd, $rs, $rt',  description: 'Subtract (with overflow).' },
  { mnemonic: 'subu',  category: 'arithmetic', format: 'subu $rd, $rs, $rt', description: 'Subtract unsigned.' },
  { mnemonic: 'addi',  category: 'arithmetic', format: 'addi $rt, $rs, imm', description: 'Add immediate (with overflow).' },
  { mnemonic: 'addiu', category: 'arithmetic', format: 'addiu $rt, $rs, imm',description: 'Add immediate unsigned (sign-extended).' },
  { mnemonic: 'lui',   category: 'arithmetic', format: 'lui $rt, imm',       description: 'Load upper immediate. $rt = imm << 16.' },

  // Logical
  { mnemonic: 'and',   category: 'logical', format: 'and $rd, $rs, $rt',  description: 'Bitwise AND.' },
  { mnemonic: 'or',    category: 'logical', format: 'or $rd, $rs, $rt',   description: 'Bitwise OR.' },
  { mnemonic: 'xor',   category: 'logical', format: 'xor $rd, $rs, $rt',  description: 'Bitwise XOR.' },
  { mnemonic: 'nor',   category: 'logical', format: 'nor $rd, $rs, $rt',  description: 'Bitwise NOR.' },
  { mnemonic: 'andi',  category: 'logical', format: 'andi $rt, $rs, imm', description: 'Bitwise AND immediate (zero-extended).' },
  { mnemonic: 'ori',   category: 'logical', format: 'ori $rt, $rs, imm',  description: 'Bitwise OR immediate.' },
  { mnemonic: 'xori',  category: 'logical', format: 'xori $rt, $rs, imm', description: 'Bitwise XOR immediate.' },

  // Shifts
  { mnemonic: 'sll',  category: 'shift', format: 'sll $rd, $rt, sa',  description: 'Shift left logical (immediate).' },
  { mnemonic: 'srl',  category: 'shift', format: 'srl $rd, $rt, sa',  description: 'Shift right logical (zero-fill).' },
  { mnemonic: 'sra',  category: 'shift', format: 'sra $rd, $rt, sa',  description: 'Shift right arithmetic (sign-extend).' },
  { mnemonic: 'sllv', category: 'shift', format: 'sllv $rd, $rt, $rs',description: 'Shift left logical (variable amount).' },
  { mnemonic: 'srlv', category: 'shift', format: 'srlv $rd, $rt, $rs',description: 'Shift right logical (variable).' },
  { mnemonic: 'srav', category: 'shift', format: 'srav $rd, $rt, $rs',description: 'Shift right arithmetic (variable).' },

  // Comparison
  { mnemonic: 'slt',   category: 'comparison', format: 'slt $rd, $rs, $rt',  description: 'Set less than (signed).' },
  { mnemonic: 'sltu',  category: 'comparison', format: 'sltu $rd, $rs, $rt', description: 'Set less than unsigned.' },
  { mnemonic: 'slti',  category: 'comparison', format: 'slti $rt, $rs, imm', description: 'Set less than immediate (signed).' },
  { mnemonic: 'sltiu', category: 'comparison', format: 'sltiu $rt, $rs, imm',description: 'Set less than immediate unsigned.' },

  // Multiply-divide
  { mnemonic: 'mult',  category: 'multiply-divide', format: 'mult $rs, $rt', description: 'Multiply signed. HI:LO = $rs * $rt.' },
  { mnemonic: 'multu', category: 'multiply-divide', format: 'multu $rs, $rt',description: 'Multiply unsigned.' },
  { mnemonic: 'div',   category: 'multiply-divide', format: 'div $rs, $rt',  description: 'Divide signed. LO = $rs/$rt; HI = $rs%$rt.' },
  { mnemonic: 'divu',  category: 'multiply-divide', format: 'divu $rs, $rt', description: 'Divide unsigned.' },
  { mnemonic: 'mfhi',  category: 'multiply-divide', format: 'mfhi $rd',      description: 'Move from HI. $rd = HI.' },
  { mnemonic: 'mflo',  category: 'multiply-divide', format: 'mflo $rd',      description: 'Move from LO. $rd = LO.' },

  // Memory
  { mnemonic: 'lw',  category: 'memory', format: 'lw $rt, off($rs)',  description: 'Load word. Address must be 4-byte aligned.' },
  { mnemonic: 'sw',  category: 'memory', format: 'sw $rt, off($rs)',  description: 'Store word. Address must be 4-byte aligned.' },
  { mnemonic: 'lh',  category: 'memory', format: 'lh $rt, off($rs)',  description: 'Load halfword (sign-extend).' },
  { mnemonic: 'lhu', category: 'memory', format: 'lhu $rt, off($rs)', description: 'Load halfword unsigned.' },
  { mnemonic: 'sh',  category: 'memory', format: 'sh $rt, off($rs)',  description: 'Store halfword.' },
  { mnemonic: 'lb',  category: 'memory', format: 'lb $rt, off($rs)',  description: 'Load byte (sign-extend).' },
  { mnemonic: 'lbu', category: 'memory', format: 'lbu $rt, off($rs)', description: 'Load byte unsigned.' },
  { mnemonic: 'sb',  category: 'memory', format: 'sb $rt, off($rs)',  description: 'Store byte.' },

  // Branch
  { mnemonic: 'beq',  category: 'branch', format: 'beq $rs, $rt, label', description: 'Branch if equal.' },
  { mnemonic: 'bne',  category: 'branch', format: 'bne $rs, $rt, label', description: 'Branch if not equal.' },
  { mnemonic: 'bgtz', category: 'branch', format: 'bgtz $rs, label',     description: 'Branch if > 0 (signed).' },
  { mnemonic: 'bltz', category: 'branch', format: 'bltz $rs, label',     description: 'Branch if < 0.' },
  { mnemonic: 'blez', category: 'branch', format: 'blez $rs, label',     description: 'Branch if ≤ 0.' },
  { mnemonic: 'bgez', category: 'branch', format: 'bgez $rs, label',     description: 'Branch if ≥ 0.' },

  // Jump
  { mnemonic: 'j',    category: 'jump', format: 'j label',         description: 'Unconditional jump.' },
  { mnemonic: 'jal',  category: 'jump', format: 'jal label',       description: 'Jump and link. $ra = PC + 4.' },
  { mnemonic: 'jr',   category: 'jump', format: 'jr $rs',          description: 'Jump register. PC = $rs.' },
  { mnemonic: 'jalr', category: 'jump', format: 'jalr $rd, $rs',   description: 'Jump and link register.' },

  // Syscall
  { mnemonic: 'syscall', category: 'syscall', format: 'syscall', description: 'System call. $v0 selects service.' },

  // Trap
  { mnemonic: 'teq',  category: 'trap', format: 'teq $rs, $rt',  description: 'Trap if equal.' },
  { mnemonic: 'tne',  category: 'trap', format: 'tne $rs, $rt',  description: 'Trap if not equal.' },
  { mnemonic: 'tlt',  category: 'trap', format: 'tlt $rs, $rt',  description: 'Trap if less than (signed).' },
  { mnemonic: 'tltu', category: 'trap', format: 'tltu $rs, $rt', description: 'Trap if less than (unsigned).' },
  { mnemonic: 'tge',  category: 'trap', format: 'tge $rs, $rt',  description: 'Trap if greater or equal (signed).' },
  { mnemonic: 'tgeu', category: 'trap', format: 'tgeu $rs, $rt', description: 'Trap if greater or equal (unsigned).' },

  // FPU
  { mnemonic: 'add.s',   category: 'fpu', format: 'add.s $fd, $fs, $ft', description: 'Single-precision add.' },
  { mnemonic: 'sub.s',   category: 'fpu', format: 'sub.s $fd, $fs, $ft', description: 'Single-precision subtract.' },
  { mnemonic: 'mul.s',   category: 'fpu', format: 'mul.s $fd, $fs, $ft', description: 'Single-precision multiply.' },
  { mnemonic: 'div.s',   category: 'fpu', format: 'div.s $fd, $fs, $ft', description: 'Single-precision divide.' },
  { mnemonic: 'sqrt.s',  category: 'fpu', format: 'sqrt.s $fd, $fs',     description: 'Single-precision square root.' },
  { mnemonic: 'abs.s',   category: 'fpu', format: 'abs.s $fd, $fs',      description: 'Single-precision absolute value.' },
  { mnemonic: 'mov.s',   category: 'fpu', format: 'mov.s $fd, $fs',      description: 'Copy single-precision (bit-for-bit).' },
  { mnemonic: 'neg.s',   category: 'fpu', format: 'neg.s $fd, $fs',      description: 'Single-precision negate.' },
  { mnemonic: 'cvt.s.w', category: 'fpu', format: 'cvt.s.w $fd, $fs',    description: 'Convert int32 to float.' },
  { mnemonic: 'cvt.w.s', category: 'fpu', format: 'cvt.w.s $fd, $fs',    description: 'Convert float to int32 (truncate).' },
  { mnemonic: 'c.eq.s',  category: 'fpu', format: 'c.eq.s $fs, $ft',     description: 'Compare equal (single).' },
  { mnemonic: 'c.lt.s',  category: 'fpu', format: 'c.lt.s $fs, $ft',     description: 'Compare less-than (single).' },
  { mnemonic: 'c.le.s',  category: 'fpu', format: 'c.le.s $fs, $ft',     description: 'Compare less-or-equal (single).' },
  { mnemonic: 'bc1f',    category: 'fpu', format: 'bc1f label',          description: 'Branch on FPU cc[0] false.' },
  { mnemonic: 'bc1t',    category: 'fpu', format: 'bc1t label',          description: 'Branch on FPU cc[0] true.' },
  { mnemonic: 'mfc1',    category: 'fpu', format: 'mfc1 $rt, $fs',       description: 'Move FPR to GPR (sign-extended).' },
  { mnemonic: 'mtc1',    category: 'fpu', format: 'mtc1 $rt, $fs',       description: 'Move GPR to FPR.' },
  { mnemonic: 'lwc1',    category: 'fpu', format: 'lwc1 $ft, off($rs)',  description: 'Load word into FPR.' },
  { mnemonic: 'swc1',    category: 'fpu', format: 'swc1 $ft, off($rs)',  description: 'Store word from FPR.' },

  // Pseudo-instructions
  { mnemonic: 'li',   category: 'pseudo', format: 'li $rt, imm',           description: 'Load immediate. Expands to ori or lui+ori.' },
  { mnemonic: 'la',   category: 'pseudo', format: 'la $rt, label',         description: 'Load address. Expands to lui + ori.' },
  { mnemonic: 'move', category: 'pseudo', format: 'move $rd, $rs',         description: 'Copy register. Expands to addu $rd, $rs, $zero.' },
  { mnemonic: 'blt',  category: 'pseudo', format: 'blt $rs, $rt, label',   description: 'Branch if less than. slt + bne.' },
  { mnemonic: 'ble',  category: 'pseudo', format: 'ble $rs, $rt, label',   description: 'Branch if less or equal. slt + beq.' },
  { mnemonic: 'bgt',  category: 'pseudo', format: 'bgt $rs, $rt, label',   description: 'Branch if greater than. slt + bne (swapped).' },
  { mnemonic: 'bge',  category: 'pseudo', format: 'bge $rs, $rt, label',   description: 'Branch if greater or equal. slt + beq.' },
  { mnemonic: 'abs',  category: 'pseudo', format: 'abs $rd, $rs',          description: 'Absolute value. sra + xor + sub.' },
  { mnemonic: 'sge',  category: 'pseudo', format: 'sge $rd, $rs, $rt',     description: 'Set if greater or equal. slt + xori 1.' },
  { mnemonic: 'sgt',  category: 'pseudo', format: 'sgt $rd, $rs, $rt',     description: 'Set if greater than. slt with operands swapped.' },
  { mnemonic: 'neg',  category: 'pseudo', format: 'neg $rd, $rs',          description: 'Negate. sub $rd, $zero, $rs.' },
  { mnemonic: 'not',  category: 'pseudo', format: 'not $rd, $rs',          description: 'Bitwise NOT. nor $rd, $rs, $zero.' },
  { mnemonic: 'nop',  category: 'pseudo', format: 'nop',                   description: 'No operation. sll $zero, $zero, 0.' },
]

export interface DirectiveEntry {
  name: string
  description: string
}

export const DIRECTIVE_ENTRIES: ReadonlyArray<DirectiveEntry> = [
  { name: '.text',    description: 'Switch to the text segment (executable code).' },
  { name: '.data',    description: 'Switch to the data segment (initialized data).' },
  { name: '.word',    description: 'Reserve one or more 32-bit words. Comma-separated values.' },
  { name: '.half',    description: 'Reserve one or more 16-bit halfwords.' },
  { name: '.byte',    description: 'Reserve one or more bytes.' },
  { name: '.ascii',   description: 'Embed an ASCII string (no terminator).' },
  { name: '.asciiz',  description: 'Embed a NUL-terminated ASCII string.' },
  { name: '.space',   description: 'Reserve N uninitialized bytes.' },
  { name: '.globl',   description: 'Declare a symbol as global. No-op in single-file assembly.' },
  { name: '.extern',  description: 'Declare an external symbol. No-op in single-file assembly.' },
]

export interface SyscallEntry {
  code: number
  name: string
  args: string
  result: string
}

export const SYSCALL_ENTRIES: ReadonlyArray<SyscallEntry> = [
  { code: 1,  name: 'print int',          args: '$a0 = integer',                         result: 'prints to console' },
  { code: 4,  name: 'print string',       args: '$a0 = address of NUL-terminated string',result: 'prints to console' },
  { code: 5,  name: 'read int',           args: '(none)',                                 result: '$v0 = parsed integer' },
  { code: 8,  name: 'read string',        args: '$a0 = buffer addr, $a1 = max length',   result: 'fills buffer + NUL' },
  { code: 10, name: 'exit',               args: '(none)',                                 result: 'halts the simulator' },
  { code: 11, name: 'print char',         args: '$a0 = codepoint (low 8 bits)',          result: 'prints character' },
  { code: 12, name: 'read char',          args: '(none)',                                 result: '$v0 = char codepoint' },
  { code: 30, name: 'system time',        args: '(none)',                                 result: '$a0 = low 32 bits of Date.now(), $a1 = high 32' },
  { code: 32, name: 'sleep',              args: '$a0 = milliseconds',                    result: 'pauses execution' },
  { code: 41, name: 'random int',         args: '(none)',                                 result: '$a0 = random int32' },
  { code: 42, name: 'random int range',   args: '$a1 = upper bound (exclusive)',         result: '$a0 = random in [0, $a1)' },
  { code: 50, name: 'confirm dialog',     args: '$a0 = prompt addr',                     result: '$a0 = 0 (yes) / 1 (no)' },
  { code: 51, name: 'input int dialog',   args: '$a0 = prompt addr',                     result: '$a0 = int, $a1 = 0/-2/-3 (ok/invalid/cancel)' },
  { code: 53, name: 'input string dialog',args: '$a0 = prompt, $a1 = buffer, $a2 = max', result: '$a1 = 0/-3/-4 (ok/cancel/truncated)' },
  { code: 54, name: 'message dialog',     args: '$a0 = prompt addr, $a1 = kind code',    result: 'shows alert dialog' },
]

export interface ExceptionEntry {
  name: string
  cause: string
  notes: string
}

export const EXCEPTION_ENTRIES: ReadonlyArray<ExceptionEntry> = [
  { name: 'Trap',                cause: 'A trap instruction (teq/tne/tlt/tltu/tge/tgeu) fired.',           notes: 'Reported as a runtime error with the operand values that triggered it.' },
  { name: 'Division by zero',    cause: 'div or divu with $rt = 0.',                                       notes: 'Throws "Division by zero" at the offending instruction.' },
  { name: 'Self-modifying code', cause: 'Store to the .text segment with the SMC guard enabled.',          notes: 'Disabled by default; enable Settings → Simulator → Self-modifying code allowed.' },
  { name: 'Unaligned access',    cause: 'lw/sw to an address not divisible by 4, lh/sh to odd address.',   notes: 'Throws an "Unaligned word/halfword" error.' },
  { name: 'Address out of range',cause: 'Load or store to an address outside text/data/stack segments.',   notes: 'Throws "Memory access out of range".' },
  { name: 'Unknown opcode',      cause: 'The fetched word does not decode to any supported instruction.',  notes: 'Often means PC ran past .text. Add an exit syscall at the end of main.' },
]
