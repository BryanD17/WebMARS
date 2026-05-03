// MIPS language registration for Monaco — Monarch tokens for syntax
// highlighting, a hover provider for the instruction reference, and a
// custom dark theme matching src/ui/tokens.css.
//
// Theme colors are inline hex because Monaco's theme API doesn't
// accept CSS variables. Keep them in sync with tokens.css; the
// matching source-of-truth values are noted next to each.

import type { Monaco } from '@monaco-editor/react'
import type { languages } from 'monaco-editor'

// Canonical v1.0 mnemonic set + a few common-but-not-required extras.
// Order matters within each category only for human readability;
// Monarch's word-boundary match (\b ... \b) handles longest-match.
const MNEMONICS = [
  // R-type arithmetic / logical
  'add', 'addu', 'sub', 'subu', 'and', 'or', 'xor', 'nor',
  'sll', 'srl', 'sra', 'sllv', 'srlv', 'srav',
  'slt', 'sltu',
  'mult', 'multu', 'div', 'divu', 'mul',
  'mfhi', 'mflo', 'mthi', 'mtlo',
  // I-type arithmetic / logical
  'addi', 'addiu', 'andi', 'ori', 'xori', 'slti', 'sltiu', 'lui',
  // Memory
  'lw', 'sw', 'lb', 'lbu', 'sb', 'lh', 'lhu', 'sh',
  // Branch / jump
  'beq', 'bne', 'bgtz', 'bltz', 'blez', 'bgez',
  'j', 'jal', 'jr', 'jalr',
  // Pseudo-instructions
  'li', 'la', 'move', 'blt', 'ble', 'bgt', 'bge', 'neg', 'not', 'nop',
  // Syscall
  'syscall',
  // Coprocessor 1 (FPU) — Phase 2B. Dotted mnemonics work because
  // the identifier regex includes '.' as a name char.
  'add.s', 'sub.s', 'mul.s', 'div.s',
  'sqrt.s', 'abs.s', 'mov.s', 'neg.s',
  'cvt.s.w', 'cvt.w.s',
  'c.eq.s', 'c.lt.s', 'c.le.s',
  'bc1f', 'bc1t',
  'mtc1', 'mfc1', 'lwc1', 'swc1',
] as const

const DIRECTIVES = [
  'data', 'text', 'word', 'asciiz', 'ascii', 'space', 'byte', 'half',
  'align', 'globl', 'extern', 'kdata', 'ktext',
] as const

// Instruction reference shown in the hover tooltip (SA-11 also uses
// this map to populate the instruction reference panel in the left
// rail). Keep one-line descriptions tight — they render in monospace
// inside Monaco's hover popup.
interface InstructionRef {
  signature: string
  desc: string
}

const INSTRUCTION_REFERENCE: Record<string, InstructionRef> = {
  // R-type
  add:    { signature: 'add $rd, $rs, $rt',      desc: 'Add (with overflow). $rd = $rs + $rt; traps on signed overflow.' },
  addu:   { signature: 'addu $rd, $rs, $rt',     desc: 'Add unsigned (no overflow trap). $rd = $rs + $rt.' },
  sub:    { signature: 'sub $rd, $rs, $rt',      desc: 'Subtract (with overflow). $rd = $rs - $rt; traps on signed overflow.' },
  subu:   { signature: 'subu $rd, $rs, $rt',     desc: 'Subtract unsigned (no overflow trap). $rd = $rs - $rt.' },
  and:    { signature: 'and $rd, $rs, $rt',      desc: 'Bitwise AND. $rd = $rs & $rt.' },
  or:     { signature: 'or $rd, $rs, $rt',       desc: 'Bitwise OR. $rd = $rs | $rt.' },
  xor:    { signature: 'xor $rd, $rs, $rt',      desc: 'Bitwise XOR. $rd = $rs ^ $rt.' },
  nor:    { signature: 'nor $rd, $rs, $rt',      desc: 'Bitwise NOR. $rd = ~($rs | $rt).' },
  sll:    { signature: 'sll $rd, $rt, sa',       desc: 'Shift left logical (immediate). $rd = $rt << sa.' },
  srl:    { signature: 'srl $rd, $rt, sa',       desc: 'Shift right logical (immediate). $rd = $rt >> sa (zero-fill).' },
  sra:    { signature: 'sra $rd, $rt, sa',       desc: 'Shift right arithmetic. $rd = $rt >> sa (sign-extend).' },
  slt:    { signature: 'slt $rd, $rs, $rt',      desc: 'Set less than (signed). $rd = ($rs < $rt) ? 1 : 0.' },
  sltu:   { signature: 'sltu $rd, $rs, $rt',     desc: 'Set less than unsigned. $rd = ($rs <u $rt) ? 1 : 0.' },
  mult:   { signature: 'mult $rs, $rt',          desc: 'Multiply signed. HI:LO = $rs * $rt.' },
  multu:  { signature: 'multu $rs, $rt',         desc: 'Multiply unsigned. HI:LO = $rs * $rt.' },
  div:    { signature: 'div $rs, $rt',           desc: 'Divide signed. LO = $rs / $rt; HI = $rs % $rt.' },
  divu:   { signature: 'divu $rs, $rt',          desc: 'Divide unsigned. LO = quotient; HI = remainder.' },
  mfhi:   { signature: 'mfhi $rd',               desc: 'Move from HI. $rd = HI.' },
  mflo:   { signature: 'mflo $rd',               desc: 'Move from LO. $rd = LO.' },

  // I-type arithmetic / logical
  addi:   { signature: 'addi $rt, $rs, imm',     desc: 'Add immediate (with overflow). $rt = $rs + sign-extend(imm).' },
  addiu:  { signature: 'addiu $rt, $rs, imm',    desc: 'Add immediate unsigned (no overflow trap). $rt = $rs + sign-extend(imm).' },
  andi:   { signature: 'andi $rt, $rs, imm',     desc: 'Bitwise AND immediate. $rt = $rs & zero-extend(imm).' },
  ori:    { signature: 'ori $rt, $rs, imm',      desc: 'Bitwise OR immediate. $rt = $rs | zero-extend(imm).' },
  xori:   { signature: 'xori $rt, $rs, imm',     desc: 'Bitwise XOR immediate. $rt = $rs ^ zero-extend(imm).' },
  slti:   { signature: 'slti $rt, $rs, imm',     desc: 'Set less than immediate (signed). $rt = ($rs < imm) ? 1 : 0.' },
  sltiu:  { signature: 'sltiu $rt, $rs, imm',    desc: 'Set less than immediate unsigned. $rt = ($rs <u imm) ? 1 : 0.' },
  lui:    { signature: 'lui $rt, imm',           desc: 'Load upper immediate. $rt = imm << 16; lower 16 bits cleared.' },

  // Memory
  lw:     { signature: 'lw $rt, offset($rs)',    desc: 'Load word. $rt = MEM[$rs + offset]. Address must be 4-byte aligned.' },
  sw:     { signature: 'sw $rt, offset($rs)',    desc: 'Store word. MEM[$rs + offset] = $rt. Address must be 4-byte aligned.' },
  lb:     { signature: 'lb $rt, offset($rs)',    desc: 'Load byte (sign-extend). $rt = sign-extend(MEM[$rs + offset]).' },
  lbu:    { signature: 'lbu $rt, offset($rs)',   desc: 'Load byte unsigned (zero-extend). $rt = zero-extend(MEM[...]).' },
  sb:     { signature: 'sb $rt, offset($rs)',    desc: 'Store byte. MEM[$rs + offset] = $rt[7:0].' },
  lh:     { signature: 'lh $rt, offset($rs)',    desc: 'Load halfword (sign-extend). $rt = sign-extend(MEM[$rs + offset]).' },
  lhu:    { signature: 'lhu $rt, offset($rs)',   desc: 'Load halfword unsigned. $rt = zero-extend(MEM[...]).' },
  sh:     { signature: 'sh $rt, offset($rs)',    desc: 'Store halfword. MEM[$rs + offset] = $rt[15:0].' },

  // Branch / jump
  beq:    { signature: 'beq $rs, $rt, label',    desc: 'Branch if equal. PC = label if $rs == $rt.' },
  bne:    { signature: 'bne $rs, $rt, label',    desc: 'Branch if not equal. PC = label if $rs != $rt.' },
  bgtz:   { signature: 'bgtz $rs, label',        desc: 'Branch if > 0 (signed). PC = label if $rs > 0.' },
  bltz:   { signature: 'bltz $rs, label',        desc: 'Branch if < 0 (signed). PC = label if $rs < 0.' },
  blez:   { signature: 'blez $rs, label',        desc: 'Branch if ≤ 0 (signed). PC = label if $rs <= 0.' },
  bgez:   { signature: 'bgez $rs, label',        desc: 'Branch if ≥ 0 (signed). PC = label if $rs >= 0.' },
  j:      { signature: 'j label',                desc: 'Unconditional jump. PC = label (top 4 bits of PC preserved).' },
  jal:    { signature: 'jal label',              desc: 'Jump and link. $ra = PC + 4; PC = label.' },
  jr:     { signature: 'jr $rs',                 desc: 'Jump register. PC = $rs.' },
  jalr:   { signature: 'jalr $rd, $rs',          desc: 'Jump and link register. $rd = PC + 4; PC = $rs.' },

  // Pseudo-instructions
  li:     { signature: 'li $rt, imm',            desc: 'Load immediate (pseudo). Expands to ori (small) or lui+ori (32-bit).' },
  la:     { signature: 'la $rt, label',          desc: 'Load address (pseudo). Expands to lui + ori with label\'s address.' },
  move:   { signature: 'move $rd, $rs',          desc: 'Move register (pseudo). Expands to "addu $rd, $rs, $zero".' },
  blt:    { signature: 'blt $rs, $rt, label',    desc: 'Branch if less than (pseudo). Expands to slt + bne.' },
  ble:    { signature: 'ble $rs, $rt, label',    desc: 'Branch if less or equal (pseudo). Expands to slt + beq.' },
  bgt:    { signature: 'bgt $rs, $rt, label',    desc: 'Branch if greater than (pseudo). Expands to slt + bne with operands swapped.' },
  bge:    { signature: 'bge $rs, $rt, label',    desc: 'Branch if greater or equal (pseudo). Expands to slt + beq with operands swapped.' },
  neg:    { signature: 'neg $rd, $rs',           desc: 'Negate (pseudo). Expands to "sub $rd, $zero, $rs".' },
  not:    { signature: 'not $rd, $rs',           desc: 'Bitwise NOT (pseudo). Expands to "nor $rd, $rs, $zero".' },
  nop:    { signature: 'nop',                    desc: 'No operation (pseudo). Expands to "sll $zero, $zero, 0".' },

  // Syscall
  syscall: { signature: 'syscall',               desc: 'System call. $v0 selects service; $a0–$a3 carry args. v1.0 supports 1, 4, 5, 8, 10.' },

  // Coprocessor 1 (FPU) — single-precision arithmetic, comparison,
  // load/move, and branch. Operands are FPU registers $f0..$f31; mtc1
  // and mfc1 bridge to the GPR file.
  'add.s':  { signature: 'add.s $fd, $fs, $ft',  desc: 'Single-precision add. $fd = $fs + $ft.' },
  'sub.s':  { signature: 'sub.s $fd, $fs, $ft',  desc: 'Single-precision subtract. $fd = $fs - $ft.' },
  'mul.s':  { signature: 'mul.s $fd, $fs, $ft',  desc: 'Single-precision multiply. $fd = $fs * $ft.' },
  'div.s':  { signature: 'div.s $fd, $fs, $ft',  desc: 'Single-precision divide. $fd = $fs / $ft.' },
  'sqrt.s': { signature: 'sqrt.s $fd, $fs',      desc: 'Single-precision square root. $fd = sqrt($fs).' },
  'abs.s':  { signature: 'abs.s $fd, $fs',       desc: 'Single-precision absolute value. $fd = |$fs|.' },
  'mov.s':  { signature: 'mov.s $fd, $fs',       desc: 'Copy single-precision. $fd = $fs (bit-for-bit).' },
  'neg.s':  { signature: 'neg.s $fd, $fs',       desc: 'Single-precision negate. $fd = -$fs.' },
  'cvt.s.w':{ signature: 'cvt.s.w $fd, $fs',     desc: 'Convert int32 to single-precision. $fd = (float) $fs.' },
  'cvt.w.s':{ signature: 'cvt.w.s $fd, $fs',     desc: 'Convert single-precision to int32 (truncate). $fd = (int) $fs.' },
  'c.eq.s': { signature: 'c.eq.s $fs, $ft',      desc: 'Compare equal (single). cc[0] = ($fs == $ft).' },
  'c.lt.s': { signature: 'c.lt.s $fs, $ft',      desc: 'Compare less-than (single). cc[0] = ($fs < $ft).' },
  'c.le.s': { signature: 'c.le.s $fs, $ft',      desc: 'Compare less-or-equal (single). cc[0] = ($fs <= $ft).' },
  'bc1f':   { signature: 'bc1f label',           desc: 'Branch if FPU cc[0] is false. PC = label if !cc[0].' },
  'bc1t':   { signature: 'bc1t label',           desc: 'Branch if FPU cc[0] is true. PC = label if cc[0].' },
  'mtc1':   { signature: 'mtc1 $rt, $fs',        desc: 'Move word from GPR to FPR. $fs ← bits($rt).' },
  'mfc1':   { signature: 'mfc1 $rt, $fs',        desc: 'Move word from FPR to GPR. $rt ← bits($fs) (sign-extended).' },
  'lwc1':   { signature: 'lwc1 $ft, offset($rs)',desc: 'Load word into FPR. $ft = MEM[$rs + offset]. Address must be 4-byte aligned.' },
  'swc1':   { signature: 'swc1 $ft, offset($rs)',desc: 'Store word from FPR. MEM[$rs + offset] = $ft. Address must be 4-byte aligned.' },
}

const monarchTokens: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.mips',
  ignoreCase: false,

  // Mnemonics injected via the `keywords` field for case-insensitive
  // matching via the `@keywords` reference inside the tokenizer rules.
  keywords: [...MNEMONICS],
  directives: [...DIRECTIVES],

  brackets: [
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],

  tokenizer: {
    root: [
      // Comments (# to EOL)
      [/#.*$/, 'comment'],

      // String literals — switch to @string state for escape handling
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

      // Directives (.data, .text, .asciiz, etc.)
      [/\.([a-zA-Z][a-zA-Z0-9_]*)/, {
        cases: {
          '$1@directives': 'directive',
          '@default': 'invalid',
        },
      }],

      // Registers — covers $zero..$ra ABI names and $0..$31 numeric.
      [/\$([a-zA-Z][a-zA-Z0-9]*|\d+)/, 'register'],

      // Hex / decimal numbers (with optional sign)
      [/-?0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/-?\d+/,                'number'],

      // Labels (identifier followed by ':')
      [/[a-zA-Z_][a-zA-Z0-9_.]*:/, 'label'],

      // Mnemonics + plain identifiers (label refs)
      [/[a-zA-Z_][a-zA-Z0-9_.]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default':  'identifier',
        },
      }],

      // Whitespace
      [/[ \t\r\n]+/, 'white'],

      // Punctuation
      [/[(),]/, 'delimiter'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./,    'string.escape'],
      [/"/,      { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],
  },
}

const themeData = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment',       foreground: '525252', fontStyle: 'italic' },
    { token: 'keyword',       foreground: '22d3ee' },                       // mnemonics — --accent
    { token: 'number',        foreground: 'fafafa' },                        // --ink-1
    { token: 'number.hex',    foreground: 'fafafa' },
    { token: 'string',        foreground: '10b981' },                        // --ok
    { token: 'string.escape', foreground: 'f59e0b' },                        // --warn
    { token: 'string.quote',  foreground: '10b981' },
    { token: 'directive',     foreground: 'f59e0b' },                        // --warn
    { token: 'register',      foreground: '22d3ee', fontStyle: 'bold' },     // --accent bold
    { token: 'label',         foreground: 'fafafa', fontStyle: 'bold' },     // --ink-1 bold
    { token: 'identifier',    foreground: 'a1a1aa' },                        // --ink-2
    { token: 'delimiter',     foreground: 'a1a1aa' },
    { token: 'invalid',       foreground: 'ef4444' },                        // --danger
  ],
  // The hex literals below mirror src/ui/tokens.css. Monaco doesn't
  // accept var(--…) — these strings are the only place outside
  // tokens.css where hex appears.
  colors: {
    'editor.background':                  '#0a0a0a', // --surface-0
    'editor.foreground':                  '#fafafa', // --ink-1
    'editorLineNumber.foreground':        '#525252', // --ink-3
    'editorLineNumber.activeForeground':  '#fafafa',
    'editor.lineHighlightBackground':     '#11111180', // --surface-1 with 50% alpha
    'editor.lineHighlightBorder':         '#11111100',
    'editorCursor.foreground':            '#22d3ee', // --accent
    'editor.selectionBackground':         '#22d3ee33',
    'editor.inactiveSelectionBackground': '#22d3ee1a',
    'editorIndentGuide.background':       '#1f1f1f', // --column-guide
    'editorIndentGuide.activeBackground': '#262626', // --surface-3
    'editorRuler.foreground':             '#1f1f1f',
    'editorWidget.background':            '#0d0d0d', // --surface-elev
    'editorWidget.border':                '#262626', // --border
    'editorHoverWidget.background':       '#0d0d0d',
    'editorHoverWidget.border':           '#262626',
    'editorBracketMatch.background':      '#22d3ee22',
    'editorBracketMatch.border':          '#22d3ee',
    'editorError.foreground':             '#ef4444',
    'editorWarning.foreground':           '#f59e0b',
    'scrollbar.shadow':                   '#00000000',
    'scrollbarSlider.background':         '#26262680',
    'scrollbarSlider.hoverBackground':    '#525252',
    'scrollbarSlider.activeBackground':   '#525252',
  },
}

const hoverProvider: languages.HoverProvider = {
  provideHover(model, position) {
    const word = model.getWordAtPosition(position)
    if (!word) return null
    const ref = INSTRUCTION_REFERENCE[word.word.toLowerCase()]
    if (!ref) return null
    return {
      range: {
        startLineNumber: position.lineNumber,
        endLineNumber:   position.lineNumber,
        startColumn:     word.startColumn,
        endColumn:       word.endColumn,
      },
      contents: [
        { value: `**${word.word.toLowerCase()}** — \`${ref.signature}\`` },
        { value: ref.desc },
      ],
    }
  },
}

let registered = false

export function registerMips(monaco: Monaco): void {
  // Idempotent — onMount can fire multiple times during HMR; the
  // language definition only needs to land once.
  if (registered) return
  registered = true

  monaco.languages.register({ id: 'mips', extensions: ['.asm', '.s', '.S', '.mips'], aliases: ['MIPS', 'mips'] })
  monaco.languages.setMonarchTokensProvider('mips', monarchTokens)
  monaco.languages.registerHoverProvider('mips', hoverProvider)
  monaco.editor.defineTheme('webmars-dark', themeData)
}

export { INSTRUCTION_REFERENCE, MNEMONICS }
