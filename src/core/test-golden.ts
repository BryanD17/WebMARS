/**
 * Golden program integration tests.
 * Run with: npx tsx src/core/test-golden.ts
 */
import { assemble } from './assembler.ts'
import { createSim, runSim } from './simulator.ts'

// ─── Runner ───────────────────────────────────────────────────────────────────

interface TestCase {
  name: string
  src: string
  expect: string  // exact expected console output (joined)
}

function run(tc: TestCase): boolean {
  const result = assemble(tc.src)

  if (result.errors.length > 0) {
    console.error(`  FAIL  ${tc.name}`)
    for (const e of result.errors) console.error(`        Assemble error line ${e.line}: ${e.message}`)
    return false
  }

  const sim = createSim(result)
  runSim(sim)

  if (sim.runtimeError) {
    console.error(`  FAIL  ${tc.name}`)
    console.error(`        Runtime error: ${sim.runtimeError}`)
    return false
  }

  const got = sim.output.join('')
  if (got === tc.expect) {
    console.log(`  PASS  ${tc.name}`)
    return true
  }

  console.error(`  FAIL  ${tc.name}`)
  console.error(`        Expected: ${JSON.stringify(tc.expect)}`)
  console.error(`        Got:      ${JSON.stringify(got)}`)
  return false
}

// ─── Golden programs ──────────────────────────────────────────────────────────

const TESTS: TestCase[] = [
  // ── 1. Sum 1..10 ────────────────────────────────────────────────────────────
  {
    name: 'Sum 1 to 10',
    expect: '55',
    src: `
.text
main:
    li   $t0, 0       # sum
    li   $t1, 1       # i
    li   $t2, 10      # N
loop:
    bgt  $t1, $t2, done
    add  $t0, $t0, $t1
    addi $t1, $t1, 1
    j    loop
done:
    li   $v0, 1
    move $a0, $t0
    syscall
    li   $v0, 10
    syscall
`,
  },

  // ── 2. Factorial 5! ─────────────────────────────────────────────────────────
  {
    name: 'Factorial 5!',
    expect: '120',
    src: `
.text
main:
    li   $a0, 5
    jal  fact
    move $a0, $v0
    li   $v0, 1
    syscall
    li   $v0, 10
    syscall

fact:
    li   $v0, 1
    beq  $a0, $zero, fact_ret
    addi $sp, $sp, -8
    sw   $ra, 4($sp)
    sw   $a0, 0($sp)
    addi $a0, $a0, -1
    jal  fact
    lw   $a0, 0($sp)
    lw   $ra, 4($sp)
    addi $sp, $sp, 8
    mul  $v0, $a0, $v0
fact_ret:
    jr   $ra
`,
  },

  // ── 3. String print ─────────────────────────────────────────────────────────
  {
    name: 'String print',
    expect: 'Hello, WebMARS!\n',
    src: `
.data
msg: .asciiz "Hello, WebMARS!\\n"

.text
main:
    li   $v0, 4
    la   $a0, msg
    syscall
    li   $v0, 10
    syscall
`,
  },

  // ── 4. Array sum ────────────────────────────────────────────────────────────
  {
    name: 'Array sum [10,20,30,40,50]',
    expect: '150',
    src: `
.data
arr: .word 10, 20, 30, 40, 50

.text
main:
    la   $t0, arr
    li   $t1, 5       # length
    li   $t2, 0       # sum
    li   $t3, 0       # i
loop:
    bge  $t3, $t1, done
    lw   $t4, 0($t0)
    add  $t2, $t2, $t4
    addi $t0, $t0, 4
    addi $t3, $t3, 1
    j    loop
done:
    li   $v0, 1
    move $a0, $t2
    syscall
    li   $v0, 10
    syscall
`,
  },

  // ── 5. Multi-value output ────────────────────────────────────────────────────
  {
    name: 'Multi-value output',
    expect: 'a=3 b=4 sum=7\n',
    src: `
.data
sa:    .asciiz "a="
sb_s:  .asciiz " b="
ssum:  .asciiz " sum="
nl:    .asciiz "\\n"

.text
main:
    li   $s0, 3      # a
    li   $s1, 4      # b
    add  $s2, $s0, $s1  # sum

    li   $v0, 4
    la   $a0, sa
    syscall

    li   $v0, 1
    move $a0, $s0
    syscall

    li   $v0, 4
    la   $a0, sb_s
    syscall

    li   $v0, 1
    move $a0, $s1
    syscall

    li   $v0, 4
    la   $a0, ssum
    syscall

    li   $v0, 1
    move $a0, $s2
    syscall

    li   $v0, 4
    la   $a0, nl
    syscall

    li   $v0, 10
    syscall
`,
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log('\nWebMARS Golden Program Tests')
console.log('─'.repeat(40))
let passed = 0
for (const tc of TESTS) {
  if (run(tc)) passed++
}
console.log('─'.repeat(40))
console.log(`${passed}/${TESTS.length} passed\n`)
if (passed < TESTS.length) process.exit(1)
