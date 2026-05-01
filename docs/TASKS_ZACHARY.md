# Zachary — Simulator/Execution tasks (Day 2 → Day 6)

This is your day-by-day plate. The store contract you'll hook into
is in `src/hooks/types.ts` and `src/hooks/useSimulator.ts`. Don't
change those signatures without a chat with the team.

For anything that smells like scope expansion, see
[`STRETCH_ROADMAP.md`](./STRETCH_ROADMAP.md) for the full
out-of-scope list and decision rule. Don't extend scope unilaterally.

## Status as of Day 1 EOD

- Day 1 scaffold has merged on `main`.
- No simulator code yet. Bryan has `src/core/` ready for you and
  Landon — plan to land your code under `src/core/simulator/`.

## Day 2 — Wednesday Apr 29

### Register file

32 GPRs + PC + HI + LO, stored as `int32`. Use `Int32Array` for
performance and automatic two's-complement wrapping.

Public API:

```ts
getReg(name: string): number
setReg(name: string, value: number): void
snapshot(): RegisterSnapshot   // matches src/hooks/types.ts
```

### `RegisterSnapshot` initial values — **important**

`initialRegisters` in `src/hooks/useSimulator.ts` now sets:

- `pc = 0x00400000` (canonical MIPS text base)
- `gpr.$sp = 0x7FFFFFFC` (canonical MARS stack-top init)

(Added in SA-6.5.) Your `reset()` must restore those exact values,
**not zero**. Import the constants from `src/hooks/useSimulator.ts`
or duplicate them — `MIPS_TEXT_BASE` and `MIPS_STACK_TOP` are the
canonical source. If we ever change them, that's the file to grep
for.

### Memory module

Three segments. For v1.0, use a simple `Map<address, byte>` per
segment — don't over-engineer with paging on Day 2:

| Segment | Range | Notes |
| --- | --- | --- |
| Text  | starts `0x00400000` | program code |
| Data  | starts `0x10010000` | `.data` directive payload |
| Stack | ends `0x7FFFEFFC`, grows down | $sp starts at the canonical top |

Expose load/store helpers: `lw`, `sw`, `lb`, `sb`, `lh`, `sh` with
**alignment checks**. Throw on misaligned access — this is how MARS
catches student bugs.

### First 10 instructions (PRD Day 2 row)

`add`, `sub`, `addi`, `and`, `or`, `lw`, `sw`, `beq`, `j`, `jal`.

Each is either a `(state, instruction) → newState` pure function or
a mutation on a state object — your call, just document it. Pick
one shape and stick with it for all instructions.

### Step / Run / Reset state machine

```
step()   executes 1 instruction; advances PC by 4 unless a branch was taken
run()    loops step() until halt or breakpoint  (breakpoints are Day 4)
reset()  restores initialRegisters, clears memory, PC = 0x00400000, $sp = 0x7FFFFFFC
```

## Day 3 — Thursday Apr 30

### Remaining core instructions (PRD §10.1)

`addu`, `subu`, `xor`, `nor`, `andi`, `ori`, `xori`, `sll`, `srl`,
`sra`, `slt`, `slti`, `sltu`, `mult`, `div`, `mfhi`, `mflo`, `lb`,
`sb`, `lh`, `sh`, `lui`, `bne`, `bgtz`, `bltz`, `blez`, `bgez`,
`jr`, `jalr`.

### Multiply / divide → HI/LO

Document the semantics in a comment at the top of the multiply
implementation:

- `mult $rs, $rt`: `HI:LO = signed product of $rs * $rt` (64-bit)
- `div $rs, $rt`: `LO = quotient`, `HI = remainder`

### Syscalls 1, 4, 5, 8, 10

Syscall handler dispatches on `$v0`:

| `$v0` | Name | Behavior |
| --- | --- | --- |
| 1 | print_int | `addConsoleLine(String($a0))` |
| 4 | print_string | read from `$a0` until `\0`, append to console |
| 5 | read_int | block on user input, write to `$v0` |
| 8 | read_string | block on user input, write to memory at `$a0` |
| 10 | exit | halt the simulator |

Console output goes through a callback the store binds in — **don't
import Zustand into core**. Expose a `setConsoleSink(fn)` on the
simulator; the store wires `addConsoleLine` to it.

### Runtime errors

Conform to `RuntimeError` from `src/hooks/types.ts`:

```ts
interface RuntimeError { pc: number; message: string; }
```

The UI reads `pc` to highlight the failing instruction in the
editor on Day 5.

## Day 4 — Friday May 1

### 5 golden programs running end-to-end

Vitest test per program: assemble + run, assert final register
state, memory state, and console output match expected.

### Cross-check against real MARS

Run each golden through real MARS, compare WebMARS output
character-for-character. Discrepancies are bugs in WebMARS *unless*
they're in the out-of-scope list (see
[`STRETCH_ROADMAP.md`](./STRETCH_ROADMAP.md)).

### Breakpoints

Store breakpoints as `Set<number>` of line numbers in Zustand.
`run()` checks before each step:

```ts
if (breakpoints.has(currentLine)) {
  setStatus('paused')
  return
}
```

## Days 5–6

- Bug bash. Sign extension everywhere.
- `lb` sign-extends, `lbu` zero-extends. **This is THE classic MIPS
  gotcha.** Test both explicitly.
- **No new instructions or syscalls.** The frozen list stands.

## Original-MARS reference points (NOT v1.0 scope — just FYI)

- Original has a "back-step" feature (undo last instruction). Out
  of scope for v1.0. If you want to leave room for it, keep your
  simulator state immutable enough that you could stack snapshots
  later (this is also what the **time-travel scrubber — Tier 3
  stretch** in `STRETCH_ROADMAP.md` would build on).
- Original has 40+ syscalls including FP, file I/O, dialogs, MIDI.
  v1.0 only does 1, 4, 5, 8, 10. Throw a clear "Syscall N not
  supported in v1.0" runtime error for everything else — students
  copying code from the MARS docs will hit unsupported syscalls and
  the error needs to tell them why.
- Original has a Coprocessor 0 (CP0) and Coprocessor 1 (FPU)
  register file. Out of scope. Don't model them.
- Original supports delayed branching (toggle in settings). Out of
  scope per PRD §1.4. Branches take effect immediately.

See [`STRETCH_ROADMAP.md`](./STRETCH_ROADMAP.md) for the full
out-of-scope list and decision rule. Don't extend scope unilaterally.

## Hand-off contract (don't change without team review)

- `RegisterSnapshot` shape — already in `src/hooks/types.ts`. The
  `changed: Set<string>` field is what drives the UI's flash-on-write
  animation in the registers panel. **If your `step()` doesn't
  populate this, the UI looks dead** — even when the simulator is
  working perfectly.
- Console output goes through `addConsoleLine` — single entry point.
  Don't write to `console.log` expecting the UI to pick it up.
- `reset()` zeros everything *except* PC and $sp (which restore to
  their canonical defaults). `step()` and `run()` never touch
  `source` — the store handles source separately.
