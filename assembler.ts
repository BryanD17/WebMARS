/**
 * assembler.ts
 * MIPS Assembler — Days 4, 5, 6, 7
 *
 * Can be used two ways:
 *
 * 1. Full pipeline from raw source string:
 *      import { assemble } from './assembler';
 *      const { output, errors } = assemble(sourceString);
 *
 * 2. From already-parsed IR (if you ran lexer + parser yourself):
 *      import { assembleIR } from './assembler';
 *      const { output, errors } = assembleIR(program, labelMap, dataLabelMap);
 */

import { lex } from "./lexer";
import { parse, ParsedLine, ParsedInstruction, ParsedDirective, Operand } from "./Parser";

// ─── Output Types ─────────────────────────────────────────────────────────────

export interface AssembledLine {
  binary: string;          // 32-bit binary string
  hex: string;             // 0xXXXXXXXX
  sourceLine: number;      // original source line number
  sourceText: string;      // original instruction text
}

export interface DataWord {
  address: number;         // memory address (0x10010000+)
  value: number;           // numeric value
  label?: string;          // label name if any
}

export interface AssembleError {
  line: number;
  message: string;
  source: string;
}

export interface AssembleResult {
  output: AssembledLine[];       // text segment (instructions)
  data: DataWord[];              // data segment (.word, .asciiz, .space)
  errors: AssembleError[];
}

// ─── Register Map ─────────────────────────────────────────────────────────────

const REGISTER_MAP: Record<string, string> = {
  $zero: "00000", $at: "00001",
  $v0:   "00010", $v1: "00011",
  $a0:   "00100", $a1: "00101", $a2: "00110", $a3: "00111",
  $t0:   "01000", $t1: "01001", $t2: "01010", $t3: "01011",
  $t4:   "01100", $t5: "01101", $t6: "01110", $t7: "01111",
  $s0:   "10000", $s1: "10001", $s2: "10010", $s3: "10011",
  $s4:   "10100", $s5: "10101", $s6: "10110", $s7: "10111",
  $t8:   "11000", $t9: "11001",
  $k0:   "11010", $k1: "11011",
  $gp:   "11100", $sp: "11101", $fp: "11110", $ra: "11111",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function reg(r: string): string {
  r = r.trim();
  if (!r.startsWith("$")) throw new Error(`Invalid register: ${r}`);
  if (REGISTER_MAP[r] !== undefined) return REGISTER_MAP[r];
  const n = parseInt(r.substring(1), 10);
  if (!isNaN(n) && n >= 0 && n <= 31) return n.toString(2).padStart(5, "0");
  throw new Error(`Unknown register: ${r}`);
}

function imm(val: string | number, bits: number): string {
  const n = typeof val === "number" ? val : parseImmediateValue(val);
  if (isNaN(n)) throw new Error(`Invalid immediate: ${val}`);
  const mask = bits === 32 ? 0xffffffff : (1 << bits) - 1;
  return (n & mask).toString(2).padStart(bits, "0");
}

function parseImmediateValue(val: string): number {
  val = val.trim();
  if (/^0[xX]/.test(val)) return parseInt(val, 16);
  if (/^0[bB]/.test(val)) return parseInt(val.slice(2), 2);
  return parseInt(val, 10);
}

function parseOffsetBase(operand: string): [string, string] {
  const parenOpen = operand.indexOf("(");
  const parenClose = operand.indexOf(")");
  if (parenOpen === -1 || parenClose === -1)
    throw new Error(`Invalid offset/base operand: ${operand}`);
  return [
    operand.substring(0, parenOpen).trim(),
    operand.substring(parenOpen + 1, parenClose).trim(),
  ];
}

function branchOffset(label: string, instrIndex: number, labelMap: Record<string, number>): string {
  label = label.trim();
  if (!(label in labelMap)) throw new Error(`Undefined label: ${label}`);
  const offset = labelMap[label] - (instrIndex + 1);
  return (offset & 0xffff).toString(2).padStart(16, "0");
}

function jumpTarget(label: string, labelMap: Record<string, number>): string {
  label = label.trim();
  if (!(label in labelMap)) throw new Error(`Undefined label: ${label}`);
  return (labelMap[label] & 0x3ffffff).toString(2).padStart(26, "0");
}

function toAssembledLine(binary: string, sourceLine: number, sourceText: string): AssembledLine {
  return {
    binary,
    hex: "0x" + parseInt(binary, 2).toString(16).padStart(8, "0").toUpperCase(),
    sourceLine,
    sourceText,
  };
}

// Get operand value as string (register name, immediate string, label name, offset string)
function opVal(op: Operand): string {
  return op.value;
}

// ─── First Pass: Build Label Maps from IR ────────────────────────────────────

function buildLabelMaps(program: ParsedLine[]): {
  labelMap: Record<string, number>;
  dataLabelMap: Record<string, number>;
  dataWords: DataWord[];
} {
  const labelMap: Record<string, number> = {};
  const dataLabelMap: Record<string, number> = {};
  const dataWords: DataWord[] = [];

  let instrIndex = 0;
  let dataAddr = 0x10010000;
  let inData = false;
  let pendingDataLabel: string | undefined;

  for (const node of program) {
    if (node.kind === "directive") {
      if (node.directive === ".data") { inData = true; continue; }
      if (node.directive === ".text") { inData = false; continue; }

      if (inData) {
        switch (node.directive) {
          case ".word": {
            for (const op of node.operands) {
              const val = parseImmediateValue(op.value);
              dataWords.push({ address: dataAddr, value: val, label: pendingDataLabel });
              if (pendingDataLabel) {
                dataLabelMap[pendingDataLabel] = dataAddr;
                pendingDataLabel = undefined;
              }
              dataAddr += 4;
            }
            break;
          }
          case ".asciiz":
          case ".ascii": {
            // Each character = 1 byte; align to 4
            for (const op of node.operands) {
              const str = op.value.slice(1, -1); // strip quotes
              const bytes = str.length + (node.directive === ".asciiz" ? 1 : 0); // +1 for null
              const words = Math.ceil(bytes / 4);
              if (pendingDataLabel) {
                dataLabelMap[pendingDataLabel] = dataAddr;
                pendingDataLabel = undefined;
              }
              dataAddr += words * 4;
            }
            break;
          }
          case ".space": {
            for (const op of node.operands) {
              const bytes = parseImmediateValue(op.value);
              const words = Math.ceil(bytes / 4);
              if (pendingDataLabel) {
                dataLabelMap[pendingDataLabel] = dataAddr;
                pendingDataLabel = undefined;
              }
              dataAddr += words * 4;
            }
            break;
          }
        }
      }
      continue;
    }

    if (node.kind === "label") {
      if (inData) {
        pendingDataLabel = node.name;
      } else {
        labelMap[node.name] = instrIndex;
      }
      continue;
    }

    if (node.kind === "instruction" && !inData) {
      // la expands to 2 instructions
      instrIndex += node.mnemonic === "la" ? 2 : 1;
      // pseudo-branches expand to 2 instructions
      if (["blt","ble","bgt","bge"].includes(node.mnemonic)) instrIndex++;
    }
  }

  return { labelMap, dataLabelMap, dataWords };
}

// ─── Instruction Translator (from IR) ────────────────────────────────────────

function translateIR(
  instr: ParsedInstruction,
  instrIndex: number,
  labelMap: Record<string, number>,
  dataLabelMap: Record<string, number>,
): string[] {
  const { mnemonic, operands, line, raw } = instr;
  const o = operands.map(opVal);

  switch (mnemonic) {
    // ── R-type: rd, rs, rt ───────────────────────────────────────────────────
    case "add":  return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000100000"];
    case "addu": return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000100001"];
    case "sub":  return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000100010"];
    case "subu": return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000100011"];
    case "and":  return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000100100"];
    case "or":   return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000100101"];
    case "xor":  return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000100110"];
    case "nor":  return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000100111"];
    case "slt":  return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000101010"];
    case "sltu": return ["000000" + reg(o[1]) + reg(o[2]) + reg(o[0]) + "00000101011"];

    // ── Shifts: rd, rt, shamt ────────────────────────────────────────────────
    case "sll": return ["00000000000" + reg(o[1]) + reg(o[0]) + imm(o[2], 5) + "000000"];
    case "srl": return ["00000000000" + reg(o[1]) + reg(o[0]) + imm(o[2], 5) + "000010"];
    case "sra": return ["00000000000" + reg(o[1]) + reg(o[0]) + imm(o[2], 5) + "000011"];

    // ── Variable shifts: rd, rt, rs ──────────────────────────────────────────
    case "sllv": return ["000000" + reg(o[2]) + reg(o[1]) + reg(o[0]) + "00000000100"];
    case "srlv": return ["000000" + reg(o[2]) + reg(o[1]) + reg(o[0]) + "00000000110"];

    // ── HI/LO: rs, rt ────────────────────────────────────────────────────────
    case "mult":  return ["000000" + reg(o[0]) + reg(o[1]) + "0000000000011000"];
    case "multu": return ["000000" + reg(o[0]) + reg(o[1]) + "0000000000011001"];
    case "div":   return ["000000" + reg(o[0]) + reg(o[1]) + "0000000000011010"];
    case "divu":  return ["000000" + reg(o[0]) + reg(o[1]) + "0000000000011011"];

    // ── Move from HI/LO: rd ──────────────────────────────────────────────────
    case "mfhi": return ["0000000000000000" + reg(o[0]) + "00000010000"];
    case "mflo": return ["0000000000000000" + reg(o[0]) + "00000010010"];

    // ── Jump register ────────────────────────────────────────────────────────
    case "jr":   return ["000000" + reg(o[0]) + "000000000000000001000"];
    case "jalr": return ["000000" + reg(o[1]) + "00000" + reg(o[0]) + "00000001001"];

    // ── Pseudo R ─────────────────────────────────────────────────────────────
    case "move": return ["000000" + reg(o[1]) + "00000" + reg(o[0]) + "00000100000"];
    case "neg":  return ["000000" + "00000" + reg(o[1]) + reg(o[0]) + "00000100010"];
    case "not":  return ["000000" + reg(o[1]) + "00000" + reg(o[0]) + "00000100111"]; // nor rd,rs,$zero — wait, actually nor $rd,$rs,$zero
    case "nop":     return ["00000000000000000000000000000000"];
    case "syscall": return ["00000000000000000000000000001100"];
    case "break":   return ["00000000000000000000000000001101"];

    // ── I-type: rt, rs, imm ──────────────────────────────────────────────────
    case "addi":  return ["001000" + reg(o[1]) + reg(o[0]) + imm(o[2], 16)];
    case "addiu": return ["001001" + reg(o[1]) + reg(o[0]) + imm(o[2], 16)];
    case "andi":  return ["001100" + reg(o[1]) + reg(o[0]) + imm(o[2], 16)];
    case "ori":   return ["001101" + reg(o[1]) + reg(o[0]) + imm(o[2], 16)];
    case "xori":  return ["001110" + reg(o[1]) + reg(o[0]) + imm(o[2], 16)];
    case "slti":  return ["001010" + reg(o[1]) + reg(o[0]) + imm(o[2], 16)];
    case "sltiu": return ["001011" + reg(o[1]) + reg(o[0]) + imm(o[2], 16)];
    case "lui":   return ["00111100000" + reg(o[0]) + imm(o[1], 16)];

    // ── Load/Store: rt, offset(base) ─────────────────────────────────────────
    case "lw": { const [off,base] = parseOffsetBase(o[1]); return ["100011" + reg(base) + reg(o[0]) + imm(off, 16)]; }
    case "lh": { const [off,base] = parseOffsetBase(o[1]); return ["100001" + reg(base) + reg(o[0]) + imm(off, 16)]; }
    case "lhu":{ const [off,base] = parseOffsetBase(o[1]); return ["100101" + reg(base) + reg(o[0]) + imm(off, 16)]; }
    case "lb": { const [off,base] = parseOffsetBase(o[1]); return ["100000" + reg(base) + reg(o[0]) + imm(off, 16)]; }
    case "lbu":{ const [off,base] = parseOffsetBase(o[1]); return ["100100" + reg(base) + reg(o[0]) + imm(off, 16)]; }
    case "sw": { const [off,base] = parseOffsetBase(o[1]); return ["101011" + reg(base) + reg(o[0]) + imm(off, 16)]; }
    case "sh": { const [off,base] = parseOffsetBase(o[1]); return ["101001" + reg(base) + reg(o[0]) + imm(off, 16)]; }
    case "sb": { const [off,base] = parseOffsetBase(o[1]); return ["101000" + reg(base) + reg(o[0]) + imm(off, 16)]; }

    // ── Branches ─────────────────────────────────────────────────────────────
    case "beq":  return ["000100" + reg(o[0]) + reg(o[1]) + branchOffset(o[2], instrIndex, labelMap)];
    case "bne":  return ["000101" + reg(o[0]) + reg(o[1]) + branchOffset(o[2], instrIndex, labelMap)];
    case "blez": return ["000110" + reg(o[0]) + "00000" + branchOffset(o[1], instrIndex, labelMap)];
    case "bgtz": return ["000111" + reg(o[0]) + "00000" + branchOffset(o[1], instrIndex, labelMap)];
    case "bltz": return ["000001" + reg(o[0]) + "00000" + branchOffset(o[1], instrIndex, labelMap)];
    case "bgez": return ["000001" + reg(o[0]) + "00001" + branchOffset(o[1], instrIndex, labelMap)];

    // ── Pseudo-branches (each expands to 2 instructions) ─────────────────────
    // blt $rs, $rt, label  →  slt $at, $rs, $rt  +  bne $at, $zero, label
    case "blt": return [
      "000000" + reg(o[0]) + reg(o[1]) + "00001" + "00000101010",   // slt $at, $rs, $rt
      "000101" + "00001" + "00000" + branchOffset(o[2], instrIndex + 1, labelMap), // bne $at,$zero,label
    ];
    // ble $rs, $rt, label  →  slt $at, $rt, $rs  +  beq $at, $zero, label
    case "ble": return [
      "000000" + reg(o[1]) + reg(o[0]) + "00001" + "00000101010",   // slt $at, $rt, $rs
      "000100" + "00001" + "00000" + branchOffset(o[2], instrIndex + 1, labelMap), // beq $at,$zero,label
    ];
    // bgt $rs, $rt, label  →  slt $at, $rt, $rs  +  bne $at, $zero, label
    case "bgt": return [
      "000000" + reg(o[1]) + reg(o[0]) + "00001" + "00000101010",   // slt $at, $rt, $rs
      "000101" + "00001" + "00000" + branchOffset(o[2], instrIndex + 1, labelMap), // bne $at,$zero,label
    ];
    // bge $rs, $rt, label  →  slt $at, $rs, $rt  +  beq $at, $zero, label
    case "bge": return [
      "000000" + reg(o[0]) + reg(o[1]) + "00001" + "00000101010",   // slt $at, $rs, $rt
      "000100" + "00001" + "00000" + branchOffset(o[2], instrIndex + 1, labelMap), // beq $at,$zero,label
    ];

    // ── Pseudo I-type ────────────────────────────────────────────────────────
    // li $rt, imm  →  addi $rt, $zero, imm
    case "li": return ["001000" + "00000" + reg(o[0]) + imm(o[1], 16)];

    // la $rt, label  →  lui $rt, upper16  +  ori $rt, $rt, lower16
    case "la": {
      const label = o[1].trim();
      const addr = dataLabelMap[label] ?? labelMap[label];
      if (addr === undefined) throw new Error(`Undefined label: ${label}`);
      const upper = ((addr >>> 16) & 0xffff).toString(2).padStart(16, "0");
      const lower = (addr & 0xffff).toString(2).padStart(16, "0");
      return [
        "00111100000" + reg(o[0]) + upper,  // lui $rt, upper
        "00110100000" + reg(o[0]) + lower,  // ori $rt, $rt, lower
      ];
    }

    // ── J-type ───────────────────────────────────────────────────────────────
    case "j":   return ["000010" + jumpTarget(o[0], labelMap)];
    case "jal": return ["000011" + jumpTarget(o[0], labelMap)];

    default:
      throw new Error(`Unknown instruction: ${mnemonic}`);
  }
}

// ─── Second Pass: Emit from IR ────────────────────────────────────────────────

function emitIR(
  program: ParsedLine[],
  labelMap: Record<string, number>,
  dataLabelMap: Record<string, number>,
): { output: AssembledLine[]; errors: AssembleError[] } {
  const output: AssembledLine[] = [];
  const errors: AssembleError[] = [];
  let instrIndex = 0;
  let inData = false;

  for (const node of program) {
    if (node.kind === "directive") {
      if (node.directive === ".data") { inData = true; continue; }
      if (node.directive === ".text") { inData = false; continue; }
      continue; // .word/.asciiz/.space handled via dataWords
    }

    if (node.kind === "label") continue;

    if (node.kind === "instruction" && !inData) {
      try {
        const binaries = translateIR(node, instrIndex, labelMap, dataLabelMap);
        for (const binary of binaries) {
          output.push(toAssembledLine(binary, node.line, node.raw));
          instrIndex++;
        }
      } catch (e: any) {
        errors.push({ line: node.line, message: e.message, source: node.raw });
        instrIndex++;
      }
    }
  }

  return { output, errors };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Assemble from already-parsed IR.
 * Use this if you ran lex() + parse() yourself and want to keep the steps separate.
 */
export function assembleIR(program: ParsedLine[]): AssembleResult {
  const { labelMap, dataLabelMap, dataWords } = buildLabelMaps(program);
  const { output, errors } = emitIR(program, labelMap, dataLabelMap);
  return { output, data: dataWords, errors };
}

/**
 * Full pipeline: raw MIPS source → assembled output.
 * Runs lex → parse → assemble in one call.
 */
export function assemble(source: string): AssembleResult {
  const { tokens, errors: lexErrors } = lex(source);
  const { program, errors: parseErrors } = parse(tokens);

  const allErrors: AssembleError[] = [
    ...lexErrors.map(e => ({ line: e.line, message: e.message, source: "" })),
    ...parseErrors.map(e => ({ line: e.line, message: e.message, source: "" })),
  ];

  const { labelMap, dataLabelMap, dataWords } = buildLabelMaps(program);
  const { output, errors: asmErrors } = emitIR(program, labelMap, dataLabelMap);

  return { output, data: dataWords, errors: [...allErrors, ...asmErrors] };
}