/**
 * MIPS Assembler - JavaScript port of Assembler.java
 * Converts MIPS assembly source to 32-bit binary strings
 *
 * Usage:
 *   import { assemble } from './assembler';
 *   const { lines, errors } = assemble(sourceString);
 */

// ─── Register Map ────────────────────────────────────────────────────────────

const REGISTER_MAP = {
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripComment(line) {
  const idx = line.indexOf("#");
    return idx === -1 ? line : line.substring(0, idx);
}

function convertRegister(reg) {
    reg = reg.trim();
    if (!reg.startsWith("$")) throw new Error(`Invalid register: ${reg}`);

    if (REGISTER_MAP[reg] !== undefined) return REGISTER_MAP[reg];

    // Numeric: $0 .. $31
  const n = parseInt(reg.substring(1), 10);
    if (!isNaN(n) && n >= 0 && n <= 31) {
        return n.toString(2).padStart(5, "0");
    }

    throw new Error(`Unknown register: ${reg}`);
}

function convertImmediate(val, bits) {
  const imm = parseInt(val.trim(), 10);
    if (isNaN(imm)) throw new Error(`Invalid immediate: ${val}`);
  const mask = (1 << bits) - 1;
    return (imm & mask).toString(2).padStart(bits, "0");
}

function parseOffsetBase(operand) {
    // e.g. "8($sp)" or "0($t0)"
  const parenOpen = operand.indexOf("(");
  const parenClose = operand.indexOf(")");
    if (parenOpen === -1 || parenClose === -1)
        throw new Error(`Invalid offset/base operand: ${operand}`);
  const offset = operand.substring(0, parenOpen).trim();
  const reg = operand.substring(parenOpen + 1, parenClose).trim();
    return [offset, reg];
}

function resolveBranchOffset(label, instrIndex, labelMap) {
    label = label.trim();
    if (!(label in labelMap)) throw new Error(`Undefined label: ${label}`);
  const targetIndex = labelMap[label];
  const offset = targetIndex - (instrIndex + 1);
    return (offset & 0xffff).toString(2).padStart(16, "0");
}

function resolveJumpTarget(label, labelMap) {
    label = label.trim();
    if (!(label in labelMap)) throw new Error(`Undefined label: ${label}`);
  const addr = labelMap[label];
    return (addr & 0x3ffffff).toString(2).padStart(26, "0");
}

// ─── First Pass: Build Label Maps ────────────────────────────────────────────

function firstPass(lines) {
  const labelMap = {};
  const dataLabelMap = {};
    let instrIndex = 0;
    let dataAddr = 0x10010000;
    let inData = false;

    for (const raw of lines) {
    const line = stripComment(raw).trim();
        if (!line) continue;

        if (line === ".data") { inData = true; continue; }
        if (line === ".text") { inData = false; continue; }

        if (inData) {
            if (line.includes(":")) {
        const label = line.substring(0, line.indexOf(":")).trim();
                dataLabelMap[label] = dataAddr;
                dataAddr += 4;
            }
            continue;
        }

        if (line.startsWith(".")) continue;

        if (line.endsWith(":")) {
      const label = line.substring(0, line.length - 1).trim();
            labelMap[label] = instrIndex;
        } else {
            // Pseudo-instructions that expand to 2 real instructions
      const mnemonic = line.split(/\s+/)[0];
            instrIndex += mnemonic === "la" ? 2 : 1;
        }
    }

    return { labelMap, dataLabelMap };
}

// ─── Instruction Translator ───────────────────────────────────────────────────

function translateInstruction(line, instrIndex, labelMap, dataLabelMap) {
  const spaceIdx = line.search(/\s/);
  const mnemonic = spaceIdx === -1 ? line : line.substring(0, spaceIdx).trim();
  const operandStr = spaceIdx === -1 ? "" : line.substring(spaceIdx + 1).trim();
  const args = operandStr === "" ? [] : operandStr.split(/\s*,\s*/);

    switch (mnemonic) {
        // ── R-type ──────────────────────────────────────────────────────────────
        case "add": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000100000"];
        }
        case "addu": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000100001"];
        }
        case "sub": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000100010"];
        }
        case "subu": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000100011"];
        }
        case "and": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000100100"];
        }
        case "or": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000100101"];
        }
        case "xor": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000100110"];
        }
        case "nor": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000100111"];
        }
        case "slt": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000101010"];
        }
        case "sltu": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const rt = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000101011"];
        }
        case "sll": {
            // sll $rd, $rt, shamt
      const rd = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
      const shamt = parseInt(args[2].trim(), 10).toString(2).padStart(5, "0");
            return ["00000000000" + rt + rd + shamt + "000000"];
        }
        case "srl": {
      const rd = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
      const shamt = parseInt(args[2].trim(), 10).toString(2).padStart(5, "0");
            return ["00000000000" + rt + rd + shamt + "000010"];
        }
        case "sra": {
      const rd = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
      const shamt = parseInt(args[2].trim(), 10).toString(2).padStart(5, "0");
            return ["00000000000" + rt + rd + shamt + "000011"];
        }
        case "sllv": {
      const rd = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
      const rs = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000000100"];
        }
        case "srlv": {
      const rd = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
      const rs = convertRegister(args[2]);
            return ["000000" + rs + rt + rd + "00000000110"];
        }
        case "mult": {
      const rs = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
            return ["000000" + rs + rt + "0000000000011000"];
        }
        case "multu": {
      const rs = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
            return ["000000" + rs + rt + "0000000000011001"];
        }
        case "div": {
      const rs = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
            return ["000000" + rs + rt + "0000000000011010"];
        }
        case "divu": {
      const rs = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
            return ["000000" + rs + rt + "0000000000011011"];
        }
        case "mfhi": {
      const rd = convertRegister(args[0]);
            return ["0000000000000000" + rd + "00000010000"];
        }
        case "mflo": {
      const rd = convertRegister(args[0]);
            return ["0000000000000000" + rd + "00000010010"];
        }
        case "jr": {
      const rs = convertRegister(args[0]);
            return ["000000" + rs + "000000000000000001000"];
        }
        case "jalr": {
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
            return ["000000" + rs + "00000" + rd + "00000001001"];
        }

        // ── Pseudo R-type ────────────────────────────────────────────────────────
        case "move": {
            // move $rd, $rs  →  add $rd, $rs, $zero
      const rd = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
            return ["000000" + rs + "00000" + rd + "00000100000"];
        }
        case "nop": {
            return ["00000000000000000000000000000000"];
        }
        case "syscall": {
            return ["00000000000000000000000000001100"];
        }
        case "break": {
            return ["00000000000000000000000000001101"];
        }

        // ── I-type ───────────────────────────────────────────────────────────────
        case "addi": {
      const rt = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const imm = convertImmediate(args[2], 16);
            return ["001000" + rs + rt + imm];
        }
        case "addiu": {
      const rt = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const imm = convertImmediate(args[2], 16);
            return ["001001" + rs + rt + imm];
        }
        case "andi": {
      const rt = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const imm = convertImmediate(args[2], 16);
            return ["001100" + rs + rt + imm];
        }
        case "ori": {
      const rt = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const imm = convertImmediate(args[2], 16);
            return ["001101" + rs + rt + imm];
        }
        case "xori": {
      const rt = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const imm = convertImmediate(args[2], 16);
            return ["001110" + rs + rt + imm];
        }
        case "slti": {
      const rt = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const imm = convertImmediate(args[2], 16);
            return ["001010" + rs + rt + imm];
        }
        case "sltiu": {
      const rt = convertRegister(args[0]);
      const rs = convertRegister(args[1]);
      const imm = convertImmediate(args[2], 16);
            return ["001011" + rs + rt + imm];
        }
        case "lui": {
      const rt = convertRegister(args[0]);
      const imm = convertImmediate(args[1], 16);
            return ["00111100000" + rt + imm];
        }
        case "lw": {
      const rt = convertRegister(args[0]);
      const [off, base] = parseOffsetBase(args[1]);
      const rs = convertRegister(base);
      const imm = convertImmediate(off, 16);
            return ["100011" + rs + rt + imm];
        }
        case "lh": {
      const rt = convertRegister(args[0]);
      const [off, base] = parseOffsetBase(args[1]);
      const rs = convertRegister(base);
      const imm = convertImmediate(off, 16);
            return ["100001" + rs + rt + imm];
        }
        case "lhu": {
      const rt = convertRegister(args[0]);
      const [off, base] = parseOffsetBase(args[1]);
      const rs = convertRegister(base);
      const imm = convertImmediate(off, 16);
            return ["100101" + rs + rt + imm];
        }
        case "lb": {
      const rt = convertRegister(args[0]);
      const [off, base] = parseOffsetBase(args[1]);
      const rs = convertRegister(base);
      const imm = convertImmediate(off, 16);
            return ["100000" + rs + rt + imm];
        }
        case "lbu": {
      const rt = convertRegister(args[0]);
      const [off, base] = parseOffsetBase(args[1]);
      const rs = convertRegister(base);
      const imm = convertImmediate(off, 16);
            return ["100100" + rs + rt + imm];
        }
        case "sw": {
      const rt = convertRegister(args[0]);
      const [off, base] = parseOffsetBase(args[1]);
      const rs = convertRegister(base);
      const imm = convertImmediate(off, 16);
            return ["101011" + rs + rt + imm];
        }
        case "sh": {
      const rt = convertRegister(args[0]);
      const [off, base] = parseOffsetBase(args[1]);
      const rs = convertRegister(base);
      const imm = convertImmediate(off, 16);
            return ["101001" + rs + rt + imm];
        }
        case "sb": {
      const rt = convertRegister(args[0]);
      const [off, base] = parseOffsetBase(args[1]);
      const rs = convertRegister(base);
      const imm = convertImmediate(off, 16);
            return ["101000" + rs + rt + imm];
        }
        case "beq": {
      const rs = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
      const offset = resolveBranchOffset(args[2], instrIndex, labelMap);
            return ["000100" + rs + rt + offset];
        }
        case "bne": {
      const rs = convertRegister(args[0]);
      const rt = convertRegister(args[1]);
      const offset = resolveBranchOffset(args[2], instrIndex, labelMap);
            return ["000101" + rs + rt + offset];
        }
        case "blez": {
      const rs = convertRegister(args[0]);
      const offset = resolveBranchOffset(args[1], instrIndex, labelMap);
            return ["000110" + rs + "00000" + offset];
        }
        case "bgtz": {
      const rs = convertRegister(args[0]);
      const offset = resolveBranchOffset(args[1], instrIndex, labelMap);
            return ["000111" + rs + "00000" + offset];
        }
        case "bltz": {
      const rs = convertRegister(args[0]);
      const offset = resolveBranchOffset(args[1], instrIndex, labelMap);
            return ["000001" + rs + "00000" + offset];
        }
        case "bgez": {
      const rs = convertRegister(args[0]);
      const offset = resolveBranchOffset(args[1], instrIndex, labelMap);
            return ["000001" + rs + "00001" + offset];
        }

        // ── Pseudo I-type ────────────────────────────────────────────────────────
        case "li": {
            // li $rt, imm  →  addi $rt, $zero, imm
      const rt = convertRegister(args[0]);
      const imm = convertImmediate(args[1], 16);
            return ["00100010000" + rt + imm];
        }
        case "la": {
            // la $rt, label  →  lui + ori (2 instructions)
      const rt = convertRegister(args[0]);
      const label = args[1].trim();
      const addr = dataLabelMap[label] ?? labelMap[label];
            if (addr === undefined) throw new Error(`Undefined label: ${label}`);
      const upper = ((addr >>> 16) & 0xffff).toString(2).padStart(16, "0");
      const lower = (addr & 0xffff).toString(2).padStart(16, "0");
            return [
            "00111100000" + rt + upper,   // lui $rt, upper
                    "00110100000" + rt + lower,   // ori $rt, $rt, lower  (simplified)
      ];
        }

        // ── J-type ───────────────────────────────────────────────────────────────
        case "j": {
      const target = resolveJumpTarget(args[0], labelMap);
            return ["000010" + target];
        }
        case "jal": {
      const target = resolveJumpTarget(args[0], labelMap);
            return ["000011" + target];
        }

        default:
            throw new Error(`Unknown instruction: ${mnemonic}`);
    }
}

// ─── Second Pass: Translate ───────────────────────────────────────────────────

function secondPass(lines, labelMap, dataLabelMap) {
  const outputLines = [];
  const errors = [];
    let instrIndex = 0;
    let inData = false;

    for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = stripComment(raw).trim();
        if (!line) continue;

        if (line === ".data") { inData = true; outputLines.push("# .data"); continue; }
        if (line === ".text") { inData = false; outputLines.push("# .text"); continue; }

        if (inData || line.startsWith(".") || line.endsWith(":")) {
            outputLines.push("# " + line);
            continue;
        }

        try {
      const binaries = translateInstruction(line, instrIndex, labelMap, dataLabelMap);
            for (const bin of binaries) {
                outputLines.push(bin);
                instrIndex++;
            }
        } catch (e) {
            errors.push({ lineNumber: i + 1, message: e.message, source: line });
            outputLines.push("# ERROR: " + e.message);
            instrIndex++;
        }
    }

    return { outputLines, errors };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Assemble MIPS source code into binary strings.
 *
 * @param {string} source - Raw MIPS assembly source text
 * @returns {{ lines: string[], errors: Array<{lineNumber: number, message: string, source: string}> }}
 */
export function assemble(source) {
  const lines = source.split(/\r?\n/);
  const { labelMap, dataLabelMap } = firstPass(lines);
  const { outputLines, errors } = secondPass(lines, labelMap, dataLabelMap);
    return { lines: outputLines, errors };
}

/**
 * Convert binary string output to hex strings (utility)
 * @param {string[]} lines - Output from assemble()
 * @returns {string[]}
 */
export function binaryLinesToHex(lines) {
    return lines.map((line) => {
    if (line.startsWith("#")) return line;
    const num = parseInt(line, 2);
    return "0x" + num.toString(16).padStart(8, "0").toUpperCase();
  });
