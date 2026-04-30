import { describe, it, expect } from 'vitest';
import { Simulator } from '../core/simulator';
import { assemble } from '../core/instructions';
import type { SyscallIO } from '../core/syscalls';

// Inline the example programs so we don't need Node fs/path APIs in the test.
const EXAMPLES: Record<string, string> = {
  'stringPrint.asm': `
.data
greeting: .asciiz "Hello from WebMARS!\\n"
line2:    .asciiz "MIPS is fun.\\n"
.text
main:
    li $v0, 4
    la $a0, greeting
    syscall
    li $v0, 4
    la $a0, line2
    syscall
    li $v0, 10
    syscall
`,
  'arraySum.asm': `
.data
arr:    .word 10, 20, 30, 40, 50
len:    .word 5
result: .asciiz "Array sum = "
newline: .asciiz "\\n"
.text
main:
    la $t0, arr
    la $t1, len
    lw $t1, 0($t1)
    li $t2, 0
    li $t3, 0
loop:
    beq $t3, $t1, done
    sll $t4, $t3, 2
    add $t4, $t4, $t0
    lw $t5, 0($t4)
    add $t2, $t2, $t5
    addi $t3, $t3, 1
    j loop
done:
    li $v0, 4
    la $a0, result
    syscall
    move $a0, $t2
    li $v0, 1
    syscall
    li $v0, 4
    la $a0, newline
    syscall
    li $v0, 10
    syscall
`,
  'sumToN.asm': `
.data
prompt:  .asciiz "Enter N: "
result:  .asciiz "Sum = "
newline: .asciiz "\\n"
.text
main:
    li $v0, 4
    la $a0, prompt
    syscall
    li $v0, 5
    syscall
    move $t0, $v0
    li $t1, 0
    li $t2, 1
loop:
    slt $t3, $t0, $t2
    bne $t3, $zero, done
    add $t1, $t1, $t2
    addi $t2, $t2, 1
    j loop
done:
    li $v0, 4
    la $a0, result
    syscall
    move $a0, $t1
    li $v0, 1
    syscall
    li $v0, 4
    la $a0, newline
    syscall
    li $v0, 10
    syscall
`,
  'factorial.asm': `
.data
prompt:  .asciiz "Enter N: "
result:  .asciiz "N! = "
newline: .asciiz "\\n"
.text
main:
    li $v0, 4
    la $a0, prompt
    syscall
    li $v0, 5
    syscall
    move $a0, $v0
    jal factorial
    move $t0, $v0
    li $v0, 4
    la $a0, result
    syscall
    move $a0, $t0
    li $v0, 1
    syscall
    li $v0, 4
    la $a0, newline
    syscall
    li $v0, 10
    syscall
factorial:
    addi $sp, $sp, -8
    sw $ra, 4($sp)
    sw $a0, 0($sp)
    li $t0, 1
    slt $t1, $a0, $t0
    bne $t1, $zero, base_case
    addi $a0, $a0, -1
    jal factorial
    lw $a0, 0($sp)
    lw $ra, 4($sp)
    addi $sp, $sp, 8
    mult $v0, $a0
    mflo $v0
    jr $ra
base_case:
    lw $ra, 4($sp)
    addi $sp, $sp, 8
    li $v0, 1
    jr $ra
`,
  'syscallIO.asm': `
.data
prompt_int:  .asciiz "Enter an integer: "
prompt_str:  .asciiz "Enter a string: "
echo_int:    .asciiz "You entered integer: "
echo_str:    .asciiz "You entered string: "
newline:     .asciiz "\\n"
buffer:      .space 64
.text
main:
    li $v0, 4
    la $a0, prompt_int
    syscall
    li $v0, 5
    syscall
    move $t0, $v0
    li $v0, 4
    la $a0, echo_int
    syscall
    move $a0, $t0
    li $v0, 1
    syscall
    li $v0, 4
    la $a0, newline
    syscall
    li $v0, 4
    la $a0, prompt_str
    syscall
    la $a0, buffer
    li $a1, 64
    li $v0, 8
    syscall
    li $v0, 4
    la $a0, echo_str
    syscall
    la $a0, buffer
    li $v0, 4
    syscall
    li $v0, 10
    syscall
`,
};

function makeIO(inputs: string[], outputs: string[]): SyscallIO {
  let inputIdx = 0;
  return {
    print: (s) => outputs.push(s),
    readInt: () => {
      const val = parseInt(inputs[inputIdx++] ?? '0', 10);
      return Promise.resolve(val);
    },
    readString: (maxLen) => {
      const s = inputs[inputIdx++] ?? '';
      return Promise.resolve(s.slice(0, maxLen - 1));
    },
    exit: () => {},
  };
}

async function runProgram(asmPath: string, inputs: string[]): Promise<{ output: string; registers: number[] }> {
  const source = EXAMPLES[asmPath];
  if (!source) throw new Error(`Unknown example: ${asmPath}`);
  const program = assemble(source);
  if (program.errors.length > 0) {
    throw new Error(`Assembly errors: ${program.errors.map(e => `L${e.line}: ${e.message}`).join(', ')}`);
  }
  const outputs: string[] = [];
  const sim = new Simulator(makeIO(inputs, outputs));
  sim.load(program);
  await sim.run(500_000);
  return { output: outputs.join(''), registers: sim.getState().registers };
}

describe('Golden: stringPrint.asm', () => {
  it('prints two lines', async () => {
    const { output } = await runProgram('stringPrint.asm', []);
    expect(output).toContain('Hello from WebMARS!');
    expect(output).toContain('MIPS is fun.');
  });
});

describe('Golden: arraySum.asm', () => {
  it('sums [10,20,30,40,50] = 150', async () => {
    const { output } = await runProgram('arraySum.asm', []);
    expect(output).toContain('150');
  });
});

describe('Golden: sumToN.asm', () => {
  it('sum 1..5 = 15', async () => {
    const { output } = await runProgram('sumToN.asm', ['5']);
    expect(output).toContain('15');
  });

  it('sum 1..10 = 55', async () => {
    const { output } = await runProgram('sumToN.asm', ['10']);
    expect(output).toContain('55');
  });

  it('sum 1..1 = 1', async () => {
    const { output } = await runProgram('sumToN.asm', ['1']);
    expect(output).toContain('1');
  });
});

describe('Golden: factorial.asm', () => {
  it('5! = 120', async () => {
    const { output } = await runProgram('factorial.asm', ['5']);
    expect(output).toContain('120');
  });

  it('1! = 1', async () => {
    const { output } = await runProgram('factorial.asm', ['1']);
    expect(output).toContain('1');
  });

  it('0! = 1', async () => {
    const { output } = await runProgram('factorial.asm', ['0']);
    expect(output).toContain('1');
  });
});

describe('Golden: syscallIO.asm', () => {
  it('echoes integer and string', async () => {
    const { output } = await runProgram('syscallIO.asm', ['42', 'hello']);
    expect(output).toContain('42');
    expect(output).toContain('hello');
  });
});
