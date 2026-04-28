/**
 * parser.ts
 * MIPS Assembly Parser — Day 3
 *
 * Converts Token[] from the lexer into a structured IR (Intermediate Representation).
 * Each source line becomes a ParsedLine — either an instruction, directive, or label.
 *
 * Usage:
 *   import { parse } from './parser';
 *   const { program, errors } = parse(tokens);
 */

import { Token, TokenType } from "./lexer";

// ─── IR Types ─────────────────────────────────────────────────────────────────

export type OperandType =
  | "register"     // $t0
  | "immediate"    // 42, 0xFF, -7
  | "label"        // loop, main
  | "offset_base"  // 8($sp)
  | "string"       // "hello"

export interface Operand {
  type: OperandType;
  value: string;       // raw string value from source
  numericValue?: number; // parsed number (for immediates/offsets)
}

// A single parsed instruction e.g. add $t0, $t1, $t2
export interface ParsedInstruction {
  kind: "instruction";
  mnemonic: string;
  operands: Operand[];
  line: number;
  raw: string;
}

// A label definition e.g. main:
export interface ParsedLabel {
  kind: "label";
  name: string;
  line: number;
}

// A directive e.g. .word 42  /  .asciiz "hello"
export interface ParsedDirective {
  kind: "directive";
  directive: string;     // ".word", ".asciiz", etc.
  operands: Operand[];
  line: number;
}

export type ParsedLine = ParsedInstruction | ParsedLabel | ParsedDirective;

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  program: ParsedLine[];
  errors: ParseError[];
}

// ─── Operand Constraints ─────────────────────────────────────────────────────
// Defines expected operand types for each mnemonic.
// "R" = register, "I" = immediate, "L" = label ref, "OB" = offset(base)

type OperandKind = "R" | "I" | "L" | "OB";

const INSTRUCTION_SCHEMA: Record<string, OperandKind[]> = {
  // R-type: rd, rs, rt
  add:   ["R","R","R"], addu:  ["R","R","R"],
  sub:   ["R","R","R"], subu:  ["R","R","R"],
  and:   ["R","R","R"], or:    ["R","R","R"],
  xor:   ["R","R","R"], nor:   ["R","R","R"],
  slt:   ["R","R","R"], sltu:  ["R","R","R"],
  // Shift: rd, rt, shamt
  sll:   ["R","R","I"], srl:   ["R","R","I"], sra:   ["R","R","I"],
  // Variable shift: rd, rt, rs
  // HI/LO ops: rs, rt
  mult:  ["R","R"],
  div:   ["R","R"], 
  // Move from HI/LO: rd
  mfhi:  ["R"], mflo: ["R"],
  // Jump register
  jr:    ["R"], jalr: ["R","R"],
  // I-type: rt, rs, imm
  addi:  ["R","R","I"], addiu: ["R","R","I"],
  andi:  ["R","R","I"], ori:   ["R","R","I"],
  xori:  ["R","R","I"], slti:  ["R","R","I"], 
  lui:   ["R","I"],
  // Load/store: rt, offset(base)
  lw:    ["R","OB"], lh:  ["R","OB"], 
  lb:    ["R","OB"], 
  sw:    ["R","OB"], sh:  ["R","OB"], sb:  ["R","OB"],
  // Branch: rs, rt, label  (blez/bgtz/bltz/bgez only have rs)
  beq:   ["R","R","L"], bne:  ["R","R","L"],
  blez:  ["R","L"],     bgtz: ["R","L"],
  bltz:  ["R","L"],     bgez: ["R","L"],
  // Pseudo-branches: rs, rt, label
  blt:   ["R","R","L"], ble: ["R","R","L"],
  bgt:   ["R","R","L"], bge: ["R","R","L"],
  // J-type
  j:     ["L"], jal: ["L"],
  // Pseudo
  li:    ["R","I"],
  la:    ["R","L"],
  move:  ["R","R"],
  neg:   ["R","R"], not: ["R","R"],
  // No operands
  nop:      [],
  syscall:  [],
  break:    [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseImmediate(val: string): number {
  val = val.trim();
  if (/^0[xX]/.test(val)) return parseInt(val, 16);
  if (/^0[bB]/.test(val)) return parseInt(val.slice(2), 2);
  return parseInt(val, 10);
}

function tokenToOperand(tok: Token): Operand | null {
  switch (tok.type) {
    case "REGISTER":
      return { type: "register", value: tok.value };
    case "IMMEDIATE":
      return { type: "immediate", value: tok.value, numericValue: parseImmediate(tok.value) };
    case "LABEL_REF":
      return { type: "label", value: tok.value };
    case "OFFSET_BASE":
      return { type: "offset_base", value: tok.value };
    case "STRING":
      return { type: "string", value: tok.value };
    default:
      return null;
  }
}

function kindMatches(operand: Operand, expected: OperandKind): boolean {
  switch (expected) {
    case "R":  return operand.type === "register";
    case "I":  return operand.type === "immediate";
    case "L":  return operand.type === "label";
    case "OB": return operand.type === "offset_base";
  }
}

function kindLabel(k: OperandKind): string {
  return { R: "register", I: "immediate", L: "label", OB: "offset(base)" }[k];
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parse(tokens: Token[]): ParseResult {
  const program: ParsedLine[] = [];
  const errors: ParseError[] = [];

  // Group tokens into logical lines (split on NEWLINE)
  const logicalLines: Token[][] = [];
  let current: Token[] = [];

  for (const tok of tokens) {
    if (tok.type === "COMMENT") continue; // skip comments entirely
    if (tok.type === "NEWLINE") {
      if (current.length > 0) logicalLines.push(current);
      current = [];
    } else {
      current.push(tok);
    }
  }
  if (current.length > 0) logicalLines.push(current);

  // Parse each logical line
  for (const line of logicalLines) {
    if (line.length === 0) continue;

    const lineNum = line[0].line;
    let i = 0;

    // ── Label definition ────────────────────────────────────────────────────
    if (line[i].type === "LABEL_DEF") {
      program.push({ kind: "label", name: line[i].value, line: lineNum });
      i++;
      // Instruction may follow on same line e.g. "main: addi $t0, $zero, 1"
      if (i >= line.length) continue;
    }

    if (i >= line.length) continue;

    // ── Directive ────────────────────────────────────────────────────────────
    if (line[i].type === "DIRECTIVE") {
      const directive = line[i].value;
      i++;
      const operands: Operand[] = [];

      while (i < line.length) {
        const tok = line[i];
        if (tok.type === "COMMA") { i++; continue; }
        const op = tokenToOperand(tok);
        if (op) {
          operands.push(op);
        } else {
          errors.push({ line: lineNum, message: `Unexpected token in directive: '${tok.value}'` });
        }
        i++;
      }

      program.push({ kind: "directive", directive, operands, line: lineNum });
      continue;
    }

    // ── Instruction ──────────────────────────────────────────────────────────
    if (line[i].type === "MNEMONIC") {
      const mnemonic = line[i].value;
      i++;

      // Collect operands (skip commas)
      const operands: Operand[] = [];
      while (i < line.length) {
        const tok = line[i];
        if (tok.type === "COMMA") { i++; continue; }
        const op = tokenToOperand(tok);
        if (op) {
          operands.push(op);
        } else {
          errors.push({ line: lineNum, message: `Invalid operand '${tok.value}' for '${mnemonic}'` });
        }
        i++;
      }

      // Validate against schema
      const schema = INSTRUCTION_SCHEMA[mnemonic];
      if (schema === undefined) {
        errors.push({ line: lineNum, message: `Unknown instruction: '${mnemonic}'` });
      } else if (operands.length !== schema.length) {
        errors.push({
          line: lineNum,
          message: `'${mnemonic}' expects ${schema.length} operand(s), got ${operands.length}`,
        });
      } else {
        for (let j = 0; j < schema.length; j++) {
          if (!kindMatches(operands[j], schema[j])) {
            errors.push({
              line: lineNum,
              message: `'${mnemonic}' operand ${j + 1}: expected ${kindLabel(schema[j])}, got '${operands[j].value}'`,
            });
          }
        }
      }

      const raw = line.map((t) => t.value).join(" ");
      program.push({ kind: "instruction", mnemonic, operands, line: lineNum, raw });
      continue;
    }

    // ── Unrecognized line ────────────────────────────────────────────────────
    errors.push({
      line: lineNum,
      message: `Unexpected token '${line[i].value}' (expected mnemonic, label, or directive)`,
    });
  }

  return { program, errors };
}