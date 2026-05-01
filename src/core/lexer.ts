/**
 * lexer.ts
 * MIPS Assembly Lexer — Day 2
 *
 * Converts raw MIPS source text into a flat array of Tokens.
 *
 * Usage:
 *   import { lex } from './lexer';
 *   const { tokens, errors } = lex(sourceString);
 */

// ─── Token Types ─────────────────────────────────────────────────────────────

export type TokenType =
  | "MNEMONIC"      // add, sub, lw, beq, j, ...
  | "REGISTER"      // $t0, $zero, $ra, ...
  | "IMMEDIATE"     // 42, -7, 0xFF, 0b1010
  | "LABEL_DEF"     // main:
  | "LABEL_REF"     // main (used as operand)
  | "DIRECTIVE"     // .data, .text, .word, .asciiz, .space
  | "STRING"        // "hello world"
  | "OFFSET_BASE"   // 8($sp), 0($t0)
  | "COMMA"         // ,
  | "NEWLINE"       // end of a logical line
  | "COMMENT"       // # ...
  | "UNKNOWN";      // anything unrecognized

export interface Token {
  type: TokenType;
  value: string;
  line: number;   // 1-indexed source line number
  col: number;    // 1-indexed column
}

export interface LexError {
  line: number;
  col: number;
  message: string;
}

export interface LexResult {
  tokens: Token[];
  errors: LexError[];
}

// ─── Known Mnemonics ─────────────────────────────────────────────────────────

const MNEMONICS = new Set([
  // R-type
  "add", "addu", "sub", "subu", "and", "or", "xor", "nor",
  "slt", "sltu", "sll", "srl", "sra", "sllv", "srlv",
  "mult", "multu", "div", "divu", "mfhi", "mflo",
  "jr", "jalr",
  // I-type
  "addi", "addiu", "andi", "ori", "xori", "slti", "sltiu", "lui",
  "lw", "lh", "lhu", "lb", "lbu", "sw", "sh", "sb",
  "beq", "bne", "blez", "bgtz", "bltz", "bgez",
  // J-type
  "j", "jal",
  // Pseudo
  "li", "la", "move", "nop", "syscall", "break",
  "blt", "ble", "bgt", "bge",
  "mul", "neg", "not",
  "push", "pop",
]);

const DIRECTIVES = new Set([
  ".data", ".text", ".word", ".asciiz", ".ascii",
  ".space", ".byte", ".half", ".align", ".globl",
]);

// ─── Regex Patterns ──────────────────────────────────────────────────────────

const RE_REGISTER    = /^\$([a-z][a-z0-9]*|[0-9]{1,2})/i;
const RE_HEX         = /^0[xX][0-9a-fA-F]+/;
const RE_BIN         = /^0[bB][01]+/;
const RE_DECIMAL     = /^-?[0-9]+/;
const RE_LABEL       = /^[a-zA-Z_][a-zA-Z0-9_]*/;
const RE_OFFSET_BASE = /^-?[0-9]+\s*\(\s*\$[a-zA-Z0-9]+\s*\)/;
const RE_STRING      = /^"([^"\\]|\\.)*"/;
const RE_DIRECTIVE   = /^\.[a-zA-Z]+/;

// ─── Lexer ───────────────────────────────────────────────────────────────────

export function lex(source: string): LexResult {
  const tokens: Token[] = [];
  const errors: LexError[] = [];

  const lines = source.split(/\r?\n/);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    let remaining = lines[lineIdx] ?? "";
    let col = 1;

    while (remaining.length > 0) {
      // Skip whitespace (not newline — already split by line)
      const wsMatch = remaining.match(/^[ \t]+/);
      if (wsMatch) {
        col += wsMatch[0].length;
        remaining = remaining.slice(wsMatch[0].length);
        continue;
      }

      // Comment — consume rest of line
      if (remaining.startsWith("#")) {
        tokens.push({ type: "COMMENT", value: remaining, line: lineNum, col });
        break;
      }

      // Comma
      if (remaining.startsWith(",")) {
        tokens.push({ type: "COMMA", value: ",", line: lineNum, col });
        col++;
        remaining = remaining.slice(1);
        continue;
      }

      // String literal
      const strMatch = remaining.match(RE_STRING);
      if (strMatch) {
        tokens.push({ type: "STRING", value: strMatch[0], line: lineNum, col });
        col += strMatch[0].length;
        remaining = remaining.slice(strMatch[0].length);
        continue;
      }

      // Directive (.data, .text, .word, ...)
      const dirMatch = remaining.match(RE_DIRECTIVE);
      if (dirMatch) {
        const val = dirMatch[0].toLowerCase();
        if (DIRECTIVES.has(val)) {
          tokens.push({ type: "DIRECTIVE", value: val, line: lineNum, col });
        } else {
          errors.push({ line: lineNum, col, message: `Unknown directive: ${dirMatch[0]}` });
          tokens.push({ type: "UNKNOWN", value: dirMatch[0], line: lineNum, col });
        }
        col += dirMatch[0].length;
        remaining = remaining.slice(dirMatch[0].length);
        continue;
      }

      // Register
      const regMatch = remaining.match(RE_REGISTER);
      if (regMatch) {
        tokens.push({ type: "REGISTER", value: regMatch[0], line: lineNum, col });
        col += regMatch[0].length;
        remaining = remaining.slice(regMatch[0].length);
        continue;
      }

      // Offset+base: e.g. 8($sp), -4($t0)  — must come before bare immediate
      const obMatch = remaining.match(RE_OFFSET_BASE);
      if (obMatch) {
        // Normalize whitespace inside  e.g. "8 ( $sp )" → "8($sp)"
        const normalized = obMatch[0].replace(/\s+/g, "");
        tokens.push({ type: "OFFSET_BASE", value: normalized, line: lineNum, col });
        col += obMatch[0].length;
        remaining = remaining.slice(obMatch[0].length);
        continue;
      }

      // Hex immediate
      const hexMatch = remaining.match(RE_HEX);
      if (hexMatch) {
        tokens.push({ type: "IMMEDIATE", value: hexMatch[0], line: lineNum, col });
        col += hexMatch[0].length;
        remaining = remaining.slice(hexMatch[0].length);
        continue;
      }

      // Binary immediate
      const binMatch = remaining.match(RE_BIN);
      if (binMatch) {
        tokens.push({ type: "IMMEDIATE", value: binMatch[0], line: lineNum, col });
        col += binMatch[0].length;
        remaining = remaining.slice(binMatch[0].length);
        continue;
      }

      // Decimal immediate (negative handled here too, but only if no label precedes)
      // Only match as immediate if it starts with a digit or minus-digit
      if (/^-?[0-9]/.test(remaining)) {
        const decMatch = remaining.match(RE_DECIMAL);
        if (decMatch) {
          tokens.push({ type: "IMMEDIATE", value: decMatch[0], line: lineNum, col });
          col += decMatch[0].length;
          remaining = remaining.slice(decMatch[0].length);
          continue;
        }
      }

      // Label definition (ends with colon) or mnemonic or label ref
      const labelMatch = remaining.match(RE_LABEL);
      if (labelMatch) {
        const word = labelMatch[0];
        const afterWord = remaining.slice(word.length).trimStart();

        if (afterWord.startsWith(":")) {
          // LABEL_DEF: consume word + colon
          tokens.push({ type: "LABEL_DEF", value: word, line: lineNum, col });
          const colonOffset = remaining.indexOf(":");
          col += colonOffset + 1;
          remaining = remaining.slice(colonOffset + 1);
        } else if (MNEMONICS.has(word.toLowerCase())) {
          tokens.push({ type: "MNEMONIC", value: word.toLowerCase(), line: lineNum, col });
          col += word.length;
          remaining = remaining.slice(word.length);
        } else {
          // Treat as label reference (operand)
          tokens.push({ type: "LABEL_REF", value: word, line: lineNum, col });
          col += word.length;
          remaining = remaining.slice(word.length);
        }
        continue;
      }

      // Unrecognized character
      errors.push({ line: lineNum, col, message: `Unexpected character: '${remaining[0] ?? ""}'` });
      tokens.push({ type: "UNKNOWN", value: remaining[0] ?? "", line: lineNum, col });
      col++;
      remaining = remaining.slice(1);
    }

    // Emit a NEWLINE token to mark end of each source line
    tokens.push({ type: "NEWLINE", value: "\n", line: lineNum, col });
  }

  return { tokens, errors };
}

// ─── Utility: filter out comments and newlines for parser ────────────────────

export function filterTokens(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.type !== "COMMENT" && t.type !== "NEWLINE");
}