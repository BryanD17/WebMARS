import { REGISTER_INDEX } from './registers';
import { TEXT_BASE, DATA_BASE } from './memory';
import type { AssembledProgram, EngineAssemblerError } from './types';

interface Token {
  type: 'label' | 'directive' | 'mnemonic' | 'register' | 'immediate' | 'string' | 'comma' | 'lparen' | 'rparen' | 'ident';
  value: string;
  line: number;
}

function tokenizeLine(line: string, lineNum: number): Token[] {
  const tokens: Token[] = [];
  const stripped = line.replace(/#.*$/, '').replace(/\s+/g, ' ').trim();
  if (!stripped) return tokens;

  let s = stripped;
  while (s.length > 0) {
    s = s.trim();
    if (!s) break;

    if (s.startsWith('"')) {
      const end = s.indexOf('"', 1);
      if (end === -1) break;
      tokens.push({ type: 'string', value: s.slice(1, end), line: lineNum });
      s = s.slice(end + 1);
      continue;
    }
    if (s[0] === ',') { tokens.push({ type: 'comma', value: ',', line: lineNum }); s = s.slice(1); continue; }
    if (s[0] === '(') { tokens.push({ type: 'lparen', value: '(', line: lineNum }); s = s.slice(1); continue; }
    if (s[0] === ')') { tokens.push({ type: 'rparen', value: ')', line: lineNum }); s = s.slice(1); continue; }

    const match = s.match(/^([^\s,()#"]+)/);
    if (!match) break;
    const word = match[1]!;
    s = s.slice(word.length);

    if (word.endsWith(':')) {
      tokens.push({ type: 'label', value: word.slice(0, -1), line: lineNum });
    } else if (word.startsWith('.')) {
      tokens.push({ type: 'directive', value: word, line: lineNum });
    } else if (word.startsWith('$')) {
      tokens.push({ type: 'register', value: word, line: lineNum });
    } else if (/^-?\d/.test(word) || word.startsWith('0x') || word.startsWith('0X')) {
      tokens.push({ type: 'immediate', value: word, line: lineNum });
    } else {
      tokens.push({ type: 'ident', value: word, line: lineNum });
    }
  }
  return tokens;
}

function parseImm(s: string): number {
  if (s.startsWith('0x') || s.startsWith('0X')) return parseInt(s, 16);
  return parseInt(s, 10);
}

function getReg(tok: Token | undefined, errors: EngineAssemblerError[]): number {
  if (!tok || tok.type !== 'register') {
    errors.push({ line: tok?.line ?? 0, message: `Expected register, got ${tok?.value}` });
    return 0;
  }
  const idx = REGISTER_INDEX[tok.value];
  if (idx === undefined) {
    errors.push({ line: tok.line, message: `Unknown register: ${tok.value}` });
    return 0;
  }
  return idx;
}

function rType(op: number, rs: number, rt: number, rd: number, shamt: number, funct: number): number {
  return ((op & 0x3f) << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | ((rd & 0x1f) << 11) | ((shamt & 0x1f) << 6) | (funct & 0x3f);
}

function iType(op: number, rs: number, rt: number, imm: number): number {
  return ((op & 0x3f) << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | (imm & 0xffff);
}

function jType(op: number, target: number): number {
  return ((op & 0x3f) << 26) | (target & 0x3ffffff);
}

export function assemble(source: string): AssembledProgram {
  const errors: EngineAssemblerError[] = [];
  const labels = new Map<string, number>();
  const sourceMap = new Map<number, number>();
  const instructions: number[] = [];
  const dataBytes: number[] = [];

  const lines = source.split('\n');
  let inText = true;
  let textAddr = TEXT_BASE;
  let dataAddr = DATA_BASE;

  function decodedLen(raw: string): number {
    return raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\0/g, '\0').length;
  }

  // First pass: collect labels and measure sizes.
  // Process line-by-line so that only the FIRST ident on a line is treated as
  // a mnemonic — subsequent idents are label operands (e.g. "j loop", "la $t0, arr").
  const allTokens: Token[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const toks = tokenizeLine(lines[i] ?? '', i + 1);
    allTokens.push(toks);

    let mnemonicSeen = false;

    for (let j = 0; j < toks.length; j++) {
      const tok = toks[j]!;

      if (tok.type === 'label') {
        labels.set(tok.value, inText ? textAddr : dataAddr);
      } else if (tok.type === 'directive') {
        if (tok.value === '.text') { inText = true; }
        else if (tok.value === '.data') { inText = false; }
        else if (!inText) {
          if (tok.value === '.word') {
            let k = j + 1, count = 0;
            while (k < toks.length) {
              if (toks[k]!.type === 'immediate' || toks[k]!.type === 'ident') count++;
              k++;
              if (k < toks.length && toks[k]?.type === 'comma') k++;
            }
            dataAddr += (count || 1) * 4;
          } else if (tok.value === '.asciiz') {
            const str = toks[j + 1];
            if (str?.type === 'string') dataAddr += decodedLen(str.value) + 1;
          } else if (tok.value === '.ascii') {
            const str = toks[j + 1];
            if (str?.type === 'string') dataAddr += decodedLen(str.value);
          } else if (tok.value === '.byte') {
            let k = j + 1, count = 0;
            while (k < toks.length) {
              if (toks[k]!.type === 'immediate') count++;
              k++;
              if (k < toks.length && toks[k]?.type === 'comma') k++;
            }
            dataAddr += count || 1;
          } else if (tok.value === '.half') {
            let k = j + 1, count = 0;
            while (k < toks.length) {
              if (toks[k]!.type === 'immediate') count++;
              k++;
              if (k < toks.length && toks[k]?.type === 'comma') k++;
            }
            dataAddr += (count || 1) * 2;
          } else if (tok.value === '.space') {
            const sz = toks[j + 1];
            if (sz) dataAddr += parseImm(sz.value);
          }
        }
      } else if (tok.type === 'ident' && !mnemonicSeen && inText) {
        // Only the first ident on a line is the mnemonic; the rest are operands.
        mnemonicSeen = true;
        const mn = tok.value.toLowerCase();
        if (mn === 'la') {
          textAddr += 8; // always lui + ori
        } else if (mn === 'li') {
          const immTok = toks[j + 2];
          let imm = 0;
          if (immTok?.type === 'immediate') imm = parseImm(immTok.value);
          textAddr += (imm > 0xffff || imm < -32768) ? 8 : 4;
        } else {
          textAddr += 4;
        }
      }
    }
  }

  // Reset for second pass (dataAddr not needed — second pass emits to dataBytes directly)
  inText = true;
  textAddr = TEXT_BASE;

  for (let i = 0; i < lines.length; i++) {
    const toks = allTokens[i]!;
    let j = 0;

    while (j < toks.length) {
      const tok = toks[j]!;

      if (tok.type === 'label') { j++; continue; }

      if (tok.type === 'directive') {
        const dir = tok.value;
        if (dir === '.text') { inText = true; j++; continue; }
        if (dir === '.data') { inText = false; j++; continue; }
        if (!inText) {
          if (dir === '.asciiz' || dir === '.ascii') {
            const str = toks[j + 1];
            if (str?.type === 'string') {
              const s = str.value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\0/g, '\0');
              for (let k = 0; k < s.length; k++) dataBytes.push(s.charCodeAt(k) & 0xff);
              if (dir === '.asciiz') dataBytes.push(0);
            }
            j += 2; continue;
          }
          if (dir === '.word') {
            j++;
            while (j < toks.length) {
              const v = toks[j]!;
              if (v.type === 'immediate') {
                const val = parseImm(v.value);
                dataBytes.push((val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff);
                j++;
              } else if (v.type === 'ident') {
                const addr = labels.get(v.value) ?? 0;
                dataBytes.push((addr >>> 24) & 0xff, (addr >>> 16) & 0xff, (addr >>> 8) & 0xff, addr & 0xff);
                j++;
              } else if (v.type === 'comma') { j++; }
              else break;
            }
            continue;
          }
          if (dir === '.byte') {
            j++;
            while (j < toks.length) {
              const v = toks[j]!;
              if (v.type === 'immediate') { dataBytes.push(parseImm(v.value) & 0xff); j++; }
              else if (v.type === 'comma') { j++; }
              else break;
            }
            continue;
          }
          if (dir === '.half') {
            j++;
            while (j < toks.length) {
              const v = toks[j]!;
              if (v.type === 'immediate') {
                const val = parseImm(v.value) & 0xffff;
                dataBytes.push((val >>> 8) & 0xff, val & 0xff);
                j++;
              } else if (v.type === 'comma') { j++; }
              else break;
            }
            continue;
          }
          if (dir === '.space') {
            const sz = toks[j + 1];
            if (sz) {
              const n = parseImm(sz.value);
              for (let k = 0; k < n; k++) dataBytes.push(0);
            }
            j += 2; continue;
          }
        }
        j++; continue;
      }

      if ((tok.type === 'ident') && inText) {
        const mnemonic = tok.value.toLowerCase();
        const line = tok.line;
        const pc = textAddr;
        sourceMap.set(pc, line);
        j++;

        const nextToks = toks.slice(j);
        let instr = 0;
        let consumed = 0;

        const getR = (offset: number) => getReg(nextToks[offset], errors);
        const getI = (offset: number) => {
          const t = nextToks[offset];
          if (!t) return 0;
          if (t.type === 'immediate') return parseImm(t.value);
          if (t.type === 'ident') return labels.get(t.value) ?? 0;
          return 0;
        };
        const getBranchOffset = (labelName: string) => {
          const target = labels.get(labelName);
          if (target === undefined) { errors.push({ line, message: `Undefined label: ${labelName}` }); return 0; }
          // Simulator: after fetch PC = pc+4, applies offset*4-4. So target = (pc+4) + offset*4-4 = pc + offset*4.
          // Therefore: offset = (target - pc) / 4.
          return ((target - pc) / 4) & 0xffff;
        };
        const getJTarget = (labelName: string) => {
          const target = labels.get(labelName);
          if (target === undefined) { errors.push({ line, message: `Undefined label: ${labelName}` }); return 0; }
          return (target >>> 2) & 0x3ffffff;
        };

        switch (mnemonic) {
          // 3-operand R-type: instr $rd, $rs, $rt  → rType(0, rs=getR(2), rt=getR(4), rd=getR(0), ...)
          case 'add':  instr = rType(0, getR(2), getR(4), getR(0), 0, 0x20); consumed = 5; break;
          case 'addu': instr = rType(0, getR(2), getR(4), getR(0), 0, 0x21); consumed = 5; break;
          case 'sub':  instr = rType(0, getR(2), getR(4), getR(0), 0, 0x22); consumed = 5; break;
          case 'subu': instr = rType(0, getR(2), getR(4), getR(0), 0, 0x23); consumed = 5; break;
          case 'and':  instr = rType(0, getR(2), getR(4), getR(0), 0, 0x24); consumed = 5; break;
          case 'or':   instr = rType(0, getR(2), getR(4), getR(0), 0, 0x25); consumed = 5; break;
          case 'xor':  instr = rType(0, getR(2), getR(4), getR(0), 0, 0x26); consumed = 5; break;
          case 'nor':  instr = rType(0, getR(2), getR(4), getR(0), 0, 0x27); consumed = 5; break;
          case 'slt':  instr = rType(0, getR(2), getR(4), getR(0), 0, 0x2a); consumed = 5; break;
          case 'sltu': instr = rType(0, getR(2), getR(4), getR(0), 0, 0x2b); consumed = 5; break;
          // shift immediate: sll $rd, $rt, shamt → rType(0, 0, rt=getR(2), rd=getR(0), shamt, ...)
          case 'sll':  instr = rType(0, 0, getR(2), getR(0), getI(4), 0x00); consumed = 5; break;
          case 'srl':  instr = rType(0, 0, getR(2), getR(0), getI(4), 0x02); consumed = 5; break;
          case 'sra':  instr = rType(0, 0, getR(2), getR(0), getI(4), 0x03); consumed = 5; break;
          // shift variable: sllv $rd, $rt, $rs → rType(0, rs=getR(4), rt=getR(2), rd=getR(0), ...)
          case 'sllv': instr = rType(0, getR(4), getR(2), getR(0), 0, 0x04); consumed = 5; break;
          case 'srlv': instr = rType(0, getR(4), getR(2), getR(0), 0, 0x06); consumed = 5; break;
          case 'srav': instr = rType(0, getR(4), getR(2), getR(0), 0, 0x07); consumed = 5; break;
          case 'mult': instr = rType(0, getR(0), getR(2), 0, 0, 0x18); consumed = 3; break;
          case 'multu':instr = rType(0, getR(0), getR(2), 0, 0, 0x19); consumed = 3; break;
          case 'div':  instr = rType(0, getR(0), getR(2), 0, 0, 0x1a); consumed = 3; break;
          case 'divu': instr = rType(0, getR(0), getR(2), 0, 0, 0x1b); consumed = 3; break;
          case 'mfhi': instr = rType(0, 0, 0, getR(0), 0, 0x10); consumed = 1; break;
          case 'mflo': instr = rType(0, 0, 0, getR(0), 0, 0x12); consumed = 1; break;
          case 'mthi': instr = rType(0, getR(0), 0, 0, 0, 0x11); consumed = 1; break;
          case 'mtlo': instr = rType(0, getR(0), 0, 0, 0, 0x13); consumed = 1; break;
          case 'jr':   instr = rType(0, getR(0), 0, 0, 0, 0x08); consumed = 1; break;
          case 'jalr': {
            const rd2 = nextToks[2]?.type === 'register' ? getR(0) : 31;
            const rs2 = nextToks[2]?.type === 'register' ? getR(2) : getR(0);
            instr = rType(0, rs2, 0, rd2, 0, 0x09);
            consumed = nextToks[2]?.type === 'register' ? 3 : 1;
            break;
          }
          case 'syscall': instr = rType(0, 0, 0, 0, 0, 0x0c); consumed = 0; break;
          case 'addi':  instr = iType(0x08, getR(2), getR(0), getI(4)); consumed = 5; break;
          case 'addiu': instr = iType(0x09, getR(2), getR(0), getI(4)); consumed = 5; break;
          case 'andi':  instr = iType(0x0c, getR(2), getR(0), getI(4)); consumed = 5; break;
          case 'ori':   instr = iType(0x0d, getR(2), getR(0), getI(4)); consumed = 5; break;
          case 'xori':  instr = iType(0x0e, getR(2), getR(0), getI(4)); consumed = 5; break;
          case 'slti':  instr = iType(0x0a, getR(2), getR(0), getI(4)); consumed = 5; break;
          case 'sltiu': instr = iType(0x0b, getR(2), getR(0), getI(4)); consumed = 5; break;
          case 'lui':   instr = iType(0x0f, 0, getR(0), getI(2)); consumed = 3; break;
          case 'lw':  {
            const rt2 = getR(0);
            const immTok = nextToks[2];
            let base: number, offset: number;
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value);
              base = getReg(nextToks[4], errors);
              consumed = 6;
            } else { offset = getI(2); base = getR(4); consumed = 5; }
            instr = iType(0x23, base, rt2, offset); break;
          }
          case 'sw': {
            const rt2 = getR(0);
            const immTok = nextToks[2];
            let base: number, offset: number;
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value);
              base = getReg(nextToks[4], errors);
              consumed = 6;
            } else { offset = getI(2); base = getR(4); consumed = 5; }
            instr = iType(0x2b, base, rt2, offset); break;
          }
          case 'lh': {
            const rt2 = getR(0);
            const immTok = nextToks[2];
            let base: number, offset: number;
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value);
              base = getReg(nextToks[4], errors);
              consumed = 6;
            } else { offset = getI(2); base = getR(4); consumed = 5; }
            instr = iType(0x21, base, rt2, offset); break;
          }
          case 'lhu': {
            const rt2 = getR(0);
            const immTok = nextToks[2];
            let base: number, offset: number;
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value);
              base = getReg(nextToks[4], errors);
              consumed = 6;
            } else { offset = getI(2); base = getR(4); consumed = 5; }
            instr = iType(0x25, base, rt2, offset); break;
          }
          case 'sh': {
            const rt2 = getR(0);
            const immTok = nextToks[2];
            let base: number, offset: number;
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value);
              base = getReg(nextToks[4], errors);
              consumed = 6;
            } else { offset = getI(2); base = getR(4); consumed = 5; }
            instr = iType(0x29, base, rt2, offset); break;
          }
          case 'lb': {
            const rt2 = getR(0);
            const immTok = nextToks[2];
            let base: number, offset: number;
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value);
              base = getReg(nextToks[4], errors);
              consumed = 6;
            } else { offset = getI(2); base = getR(4); consumed = 5; }
            instr = iType(0x20, base, rt2, offset); break;
          }
          case 'lbu': {
            const rt2 = getR(0);
            const immTok = nextToks[2];
            let base: number, offset: number;
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value);
              base = getReg(nextToks[4], errors);
              consumed = 6;
            } else { offset = getI(2); base = getR(4); consumed = 5; }
            instr = iType(0x24, base, rt2, offset); break;
          }
          case 'sb': {
            const rt2 = getR(0);
            const immTok = nextToks[2];
            let base: number, offset: number;
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value);
              base = getReg(nextToks[4], errors);
              consumed = 6;
            } else { offset = getI(2); base = getR(4); consumed = 5; }
            instr = iType(0x28, base, rt2, offset); break;
          }
          case 'beq': {
            const rs2 = getR(0), rt2 = getR(2);
            const labelTok = nextToks[4];
            const off = labelTok?.type === 'ident' ? getBranchOffset(labelTok.value) : getI(4);
            instr = iType(0x04, rs2, rt2, off); consumed = 5; break;
          }
          case 'bne': {
            const rs2 = getR(0), rt2 = getR(2);
            const labelTok = nextToks[4];
            const off = labelTok?.type === 'ident' ? getBranchOffset(labelTok.value) : getI(4);
            instr = iType(0x05, rs2, rt2, off); consumed = 5; break;
          }
          case 'bgtz': {
            const rs2 = getR(0);
            const labelTok = nextToks[2];
            const off = labelTok?.type === 'ident' ? getBranchOffset(labelTok.value) : getI(2);
            instr = iType(0x07, rs2, 0, off); consumed = 3; break;
          }
          case 'blez': {
            const rs2 = getR(0);
            const labelTok = nextToks[2];
            const off = labelTok?.type === 'ident' ? getBranchOffset(labelTok.value) : getI(2);
            instr = iType(0x06, rs2, 0, off); consumed = 3; break;
          }
          case 'bltz': {
            const rs2 = getR(0);
            const labelTok = nextToks[2];
            const off = labelTok?.type === 'ident' ? getBranchOffset(labelTok.value) : getI(2);
            instr = iType(0x01, rs2, 0, off); consumed = 3; break;
          }
          case 'bgez': {
            const rs2 = getR(0);
            const labelTok = nextToks[2];
            const off = labelTok?.type === 'ident' ? getBranchOffset(labelTok.value) : getI(2);
            instr = iType(0x01, rs2, 1, off); consumed = 3; break;
          }
          case 'j': {
            const labelTok = nextToks[0];
            const tgt = labelTok?.type === 'ident' ? getJTarget(labelTok.value) : (getI(0) >>> 2) & 0x3ffffff;
            instr = jType(0x02, tgt); consumed = 1; break;
          }
          case 'jal': {
            const labelTok = nextToks[0];
            const tgt = labelTok?.type === 'ident' ? getJTarget(labelTok.value) : (getI(0) >>> 2) & 0x3ffffff;
            instr = jType(0x03, tgt); consumed = 1; break;
          }
          case 'move': {
            // pseudo: move $rd, $rs => addu $rd, $zero, $rs
            // getR(0)=dest, getR(2)=source; rType(op,rs,rt,rd,...) so rt=source, rd=dest
            instr = rType(0, 0, getR(2), getR(0), 0, 0x21); consumed = 3; break;
          }
          case 'li': {
            // pseudo: li $rt, imm => addiu $rt, $zero, imm
            const rt2 = getR(0);
            const imm = getI(2);
            if (imm > 0xffff || imm < -32768) {
              // Need lui + ori — emit two instructions
              const upper = (imm >>> 16) & 0xffff;
              const lower = imm & 0xffff;
              instr = iType(0x0f, 0, rt2, upper);
              instructions.push(instr);
              textAddr += 4;
              sourceMap.set(textAddr, line);
              instr = iType(0x0d, rt2, rt2, lower);
            } else {
              instr = iType(0x09, 0, rt2, imm);
            }
            consumed = 3; break;
          }
          case 'la': {
            // pseudo: la $rt, label => lui $rt, upper; ori $rt, $rt, lower
            const rt2 = getR(0);
            const addr = labels.get(nextToks[2]?.value ?? '') ?? getI(2);
            const upper = (addr >>> 16) & 0xffff;
            const lower = addr & 0xffff;
            instr = iType(0x0f, 0, rt2, upper);
            instructions.push(instr);
            textAddr += 4;
            sourceMap.set(textAddr, line);
            instr = iType(0x0d, rt2, rt2, lower);
            consumed = 3; break;
          }
          case 'nop': instr = 0; consumed = 0; break;

          // ─ Phase 2F — trap instructions ─
          // Two-operand R-type: teq $rs, $rt → rType(0, rs=getR(0),
          // rt=getR(2), rd=0, shamt=0, funct=0x34). Code in bits
          // 15:6 (rd+shamt) is unused — set to 0.
          case 'teq':  instr = rType(0, getR(0), getR(2), 0, 0, 0x34); consumed = 3; break;
          case 'tne':  instr = rType(0, getR(0), getR(2), 0, 0, 0x36); consumed = 3; break;
          case 'tlt':  instr = rType(0, getR(0), getR(2), 0, 0, 0x32); consumed = 3; break;
          case 'tltu': instr = rType(0, getR(0), getR(2), 0, 0, 0x33); consumed = 3; break;
          case 'tge':  instr = rType(0, getR(0), getR(2), 0, 0, 0x30); consumed = 3; break;
          case 'tgeu': instr = rType(0, getR(0), getR(2), 0, 0, 0x31); consumed = 3; break;

          // ─ Coprocessor 1 (FPU) ─
          // The FPU encoding reuses the rType field layout: cop1 op
          // 0x11, with rs slot = fmt (0x10 for .s, 0x14 for .w),
          // rt slot = ft, rd slot = fs, shamt slot = fd. So the
          // assembler positions are: getR(0)→fd, getR(2)→fs,
          // getR(4)→ft, mirroring how the decoder unpacks them.

          // 3-operand single-precision: op.s $fd, $fs, $ft
          case 'add.s': instr = rType(0x11, 0x10, getR(4), getR(2), getR(0), 0x00); consumed = 5; break;
          case 'sub.s': instr = rType(0x11, 0x10, getR(4), getR(2), getR(0), 0x01); consumed = 5; break;
          case 'mul.s': instr = rType(0x11, 0x10, getR(4), getR(2), getR(0), 0x02); consumed = 5; break;
          case 'div.s': instr = rType(0x11, 0x10, getR(4), getR(2), getR(0), 0x03); consumed = 5; break;

          // 2-operand single-precision: op.s $fd, $fs (ft slot unused, must be 0)
          case 'sqrt.s': instr = rType(0x11, 0x10, 0, getR(2), getR(0), 0x04); consumed = 3; break;
          case 'abs.s':  instr = rType(0x11, 0x10, 0, getR(2), getR(0), 0x05); consumed = 3; break;
          case 'mov.s':  instr = rType(0x11, 0x10, 0, getR(2), getR(0), 0x06); consumed = 3; break;
          case 'neg.s':  instr = rType(0x11, 0x10, 0, getR(2), getR(0), 0x07); consumed = 3; break;

          // Conversions — fmt names the SOURCE format. cvt.<dst>.<src>
          case 'cvt.w.s': instr = rType(0x11, 0x10, 0, getR(2), getR(0), 0x24); consumed = 3; break;
          case 'cvt.s.w': instr = rType(0x11, 0x14, 0, getR(2), getR(0), 0x20); consumed = 3; break;

          // Compare single-precision: c.cond.s $fs, $ft (sets cc[0]; no fd)
          case 'c.eq.s': instr = rType(0x11, 0x10, getR(2), getR(0), 0, 0x32); consumed = 3; break;
          case 'c.lt.s': instr = rType(0x11, 0x10, getR(2), getR(0), 0, 0x3c); consumed = 3; break;
          case 'c.le.s': instr = rType(0x11, 0x10, getR(2), getR(0), 0, 0x3e); consumed = 3; break;

          // Branch on FP condition flag — sub-op fmt = 0x08; rt = 0
          // for bc1f (false), 1 for bc1t (true). Branch offset is
          // computed the same way as integer branches.
          case 'bc1f': {
            const labelTok = nextToks[0];
            const off = labelTok?.type === 'ident' ? getBranchOffset(labelTok.value) : getI(0);
            instr = iType(0x11, 0x08, 0x00, off); consumed = 1; break;
          }
          case 'bc1t': {
            const labelTok = nextToks[0];
            const off = labelTok?.type === 'ident' ? getBranchOffset(labelTok.value) : getI(0);
            instr = iType(0x11, 0x08, 0x01, off); consumed = 1; break;
          }

          // Move between GPR and FPR. mfc1/mtc1 use the rt field for
          // the GPR and the fs (rd) field for the FPR.
          case 'mfc1': instr = rType(0x11, 0x00, getR(0), getR(2), 0, 0x00); consumed = 3; break;
          case 'mtc1': instr = rType(0x11, 0x04, getR(0), getR(2), 0, 0x00); consumed = 3; break;

          // FP load/store — accept both "lwc1 $ft, off($rs)" and
          // the imm + base flat form, mirroring the integer lw/sw
          // parsing convention above.
          case 'lwc1': {
            const rt2 = getR(0)
            const immTok = nextToks[2]
            let base: number, offset: number
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value)
              base = getReg(nextToks[4], errors)
              consumed = 6
            } else { offset = getI(2); base = getR(4); consumed = 5 }
            instr = iType(0x31, base, rt2, offset); break
          }
          case 'swc1': {
            const rt2 = getR(0)
            const immTok = nextToks[2]
            let base: number, offset: number
            if (immTok?.type === 'immediate' && nextToks[3]?.type === 'lparen') {
              offset = parseImm(immTok.value)
              base = getReg(nextToks[4], errors)
              consumed = 6
            } else { offset = getI(2); base = getR(4); consumed = 5 }
            instr = iType(0x39, base, rt2, offset); break
          }

          default:
            errors.push({ line, message: `Unknown mnemonic: ${mnemonic}` });
        }

        instructions.push(instr);
        textAddr += 4;
        j += consumed;
        continue;
      }

      j++;
    }
  }

  return {
    instructions,
    dataSegment: new Uint8Array(dataBytes),
    textBase: TEXT_BASE,
    dataBase: DATA_BASE,
    labels,
    sourceMap,
    errors,
  };
}
