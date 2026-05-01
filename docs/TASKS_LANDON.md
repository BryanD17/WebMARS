# Landon — Assembler/Parser tasks (Day 2 → Day 6)

This is your day-by-day plate. The store contract you'll hook into is
in `src/hooks/types.ts` and `src/hooks/useSimulator.ts`. Don't change
those signatures without a chat with the team.

For anything that smells like scope expansion, see
[`STRETCH_ROADMAP.md`](./STRETCH_ROADMAP.md) for the full out-of-scope
list and decision rule. Don't extend scope unilaterally.

## Status as of Day 1 EOD

- Day 1 scaffold has merged on `main` (the squash-merge of the
  `bryan/day1-scaffold` branch).
- Your code lands in `src/core/assembler/`. The directory exists
  empty (committed via `.gitkeep`) so your first PR has a clean
  place to drop into without merge conflicts.
- **Issue #2 — cleanup of `MARSweb (Assmebler, Parser, Lexer)/`** is
  your Day 2 *morning* task. Do this BEFORE starting new feature work.
  The folder name is a typo and the JS-in-`.java`-suffix file is
  going to confuse anyone who clones the repo. Convert what's there
  to TS and move it into `src/core/assembler/`, then delete the
  legacy folder in the same PR.

## Day 2 — Wednesday Apr 29

### Cleanup pass (do this first)

- Rename `Assembler_marsweb.java` → `assembler.ts` and convert it
  from "JS in a `.java` file" to actual TypeScript.
- Move `Lexer_marsweb.ts` → `src/core/assembler/lexer.ts`.
- Move `parser.ts` (was renamed in the latest commit on `main`) →
  `src/core/assembler/parser.ts`.
- Delete the legacy `MARSweb (Assmebler, Parser, Lexer)/` folder in
  the same commit.
- Run `npm run typecheck` to confirm the new TS files compile under
  strict mode + `noUncheckedIndexedAccess`.

### Type the public API

Add type annotations to the three pipeline stages so the UI knows
exactly what each stage returns:

```ts
// src/core/assembler/lexer.ts
export interface LexResult { tokens: Token[]; errors: AssemblerError[]; }
export function lex(source: string): LexResult { /* ... */ }

// src/core/assembler/parser.ts
export interface ParseResult { program: ParsedProgram; errors: AssemblerError[]; }
export function parse(tokens: Token[]): ParseResult { /* ... */ }

// src/core/assembler/assembler.ts
export interface AssembleResult { lines: string[]; errors: AssemblerError[]; }
export function assemble(program: ParsedProgram): AssembleResult { /* ... */ }
```

Use the existing `Token` and `ParsedProgram` types from your lexer
and parser; don't redefine them.

`AssemblerError` is the type Bryan committed in
`src/hooks/types.ts`:

```ts
interface AssemblerError { line: number; message: string; }
```

If you need to add a `column` or `severity` field later, propose it
in a PR comment — don't change the shape unilaterally. The UI's
status pill and future inline-error panels read from this exact
shape.

### Pseudo-instruction expansion

Implement the v1.0 pseudo-instruction set: `li`, `la`, `move`,
`blt`, `ble`, `bgt`, `bge`. Each expands to 1–2 real instructions.

Document the expansion of each in a comment block at the top of
`pseudo.ts` so a student reading the code can see "li $t0, 100"
becomes "ori $t0, $zero, 100" (or "lui+ori" for large immediates).

### Directives — act on them

The lexer already recognizes them; the assembler now needs to
*allocate memory* and *store bytes/words at the right addresses*
for each. v1.0 set:

`.data`, `.text`, `.word`, `.asciiz`, `.ascii`, `.space`, `.byte`,
`.half`, `.align`, `.globl`.

### `loadExample` — FYI

The store now has a `loadExample(name: string)` action (added in
SA-6.5). It writes a hardcoded source string back into `source`.
Day 5 wires this to a dropdown (the **Examples dropdown — Tier 1
stretch** in [`STRETCH_ROADMAP.md`](./STRETCH_ROADMAP.md)).
For Day 2, just leave it alone — but know it exists, and conform
any source-loading flow you add to call it.

## Day 3 — Thursday Apr 30

### Two-pass assembler end-to-end

First pass builds the label table and the data-label map; second
pass emits 32-bit machine-code strings. The legacy code already
does this; the work is porting it cleanly.

### Wire into the store

Export the assembler entry point from `src/core/assembler/index.ts`:

```ts
export function assemble(source: string): AssembleResult { /* ... */ }
```

The store's `assemble` action calls into this on every Assemble
button press. Today it's a no-op stub in
`src/hooks/useSimulator.ts`; you replace the body, keep the
signature.

### Error messages students will read

These appear in the status pill (truncated to 40 chars) and will
appear inline in the editor on Day 5. Make them useful:

- ❌ `"Invalid operand"`
- ✅ `"addi expects (reg, reg, immediate), got (reg, reg, label) at line 12"`

Concrete operand expectation + what was actually seen + line number.

## Day 4 — Friday May 1

### Integration: parser → assembler → simulator

End-to-end on the 5 golden programs:
1. Sum 1 to N
2. Factorial (recursive)
3. String print (Hello, MIPS!)
4. Array sum
5. Syscall I/O (read int, print result)

Vitest tests for each: assemble + run, assert final register state
and console output.

### Sign extension on negative immediates

This is the bug MARS users hit constantly. Test that:

```mips
addi $t0, $zero, -1
```

produces `$t0 = 0xFFFFFFFF`, **not** `0x0000FFFF`. The 16-bit
immediate `-1` must sign-extend to 32 bits before adding.

### Branch offset encoding

Branch target = `(target_index - (current_index + 1)) & 0xFFFF`.
Verify on a `beq` that loops backward — that's where the off-by-one
hits.

## Days 5–6

- Bug-bash from the §3.1 punch list.
- **No new instructions.** The instruction list (PRD §10.1) is
  FROZEN as of Day 1 per PRD §8 risk row. Only add an instruction
  if a Core Feature breaks without it.

## Original-MARS reference points (NOT v1.0 scope — just FYI for architecture choices)

- Original supports macros (`.macro` / `.end_macro`). Out of scope
  for v1.0; don't design yourself out of adding it later. Keep
  parsing pluggable.
- Original has a wide directive list including `.float` and
  `.double`. We're not doing FP in v1.0; reject these directives
  with a clear "FP not supported in v1.0" error rather than silently
  mis-parsing.
- Original supports `.include` for multi-file projects. Not v1.0.
  Same rule: explicit rejection > silent failure.

See [`STRETCH_ROADMAP.md`](./STRETCH_ROADMAP.md) for the full
out-of-scope list and decision rule. Don't extend scope unilaterally.

## Hand-off contract (don't change without team review)

- `AssemblerError` shape: `{ line: number; message: string }`. Do
  not silently break this — propose changes in a PR.
- Output of `assemble()`: `{ lines: string[]; errors: AssemblerError[] }`.
  `lines` are 32-bit binary strings, one per emitted machine
  instruction.
- Pseudo-instructions count for `instrIndex` purposes only by their
  *expansion* count (`la` = 2 instructions, not 1). The simulator's
  PC arithmetic depends on this.
