# WebMARS

A modern, browser-based MIPS Assembler and Runtime Simulator.

WebMARS is a functional re-implementation of the core features of the original [MARS](https://courses.missouristate.edu/KenVollmar/MARS/) simulator, rebuilt as a web application. It is designed for students learning MIPS assembly who want a clean, fast, installation-free alternative to the original Java Swing tool.

The project is built in TypeScript with React, Vite, and Tailwind CSS, and runs entirely in the browser.

## Status

v1.1.0. Every PRD must-have and stretch goal shipped, plus the Phase 3 bug-fix sweep: missing pseudo-instructions, console first-byte fix, resizable panels, in-app help dialog, breakpoint hover preview, full Tools menu (Bitmap Display, MMIO simulator, IEEE 754 representation, memory reference visualization, screen magnifier), reworked mobile shell with tabbed layout. 119 tests passing.

See [the PRD](./docs/PRD.md) for the full scope, timeline, and roadmap, [the final report](./docs/FINAL_REPORT.md) for the project writeup, or [the demo script](./docs/DEMO_SCRIPT.md) for a seven-minute walkthrough.

## Features

The v1.0 release targets the workflows students rely on most.

### Core

- Source editor with MIPS syntax highlighting and hover docs (Monaco).
- Inline assembler-error squiggles plus an error overview ruler in the editor margin.
- Two-pass MIPS32 assembler covering roughly fifty instructions across arithmetic, logical, branch, jump, load/store, FPU, and trap families.
- Pseudo-instruction support for `li`, `la`, `move`, `blt`, `ble`, `bgt`, `bge`, `neg`, `not`, `nop`.
- Instruction-set simulator with a full 32-register integer file, 32-register single-precision FPU, HI/LO, FCSR cc[0], program counter, and a configurable text/data/stack memory layout.
- Run, Pause, Step, Backstep (snapshot history with memory-write rewind), Run-to-cursor, Reset controls plus a 1–500 instr/s speed slider.
- Live register file with per-step change highlighting; toggleable hex / decimal / binary views.
- Toggleable FPU panel showing $f0–$f31 in float and bits.
- Memory inspector with segment toggle (`.text` / `.data` / stack), base-address jump, edit-in-place, and a flash on each write.
- Click-to-set breakpoints in the editor gutter, persisted per file.
- Bottom panel: Console, Messages, Problems. Console handles syscall I/O via an inline input field; Problems aggregates assembler + runtime errors with click-to-jump.
- File system: multi-file tabs (drag to reorder), File System Access API integration for native open/save with a download fallback in non-Chromium browsers, Open Recent submenu.
- Bundled example programs covering array sum, factorial, string print, sum 1..N, syscall I/O, and FPU floating-point math.
- Symbol table panel resolving labels to addresses with click-to-jump.
- Searchable instruction reference panel.
- Settings dialog: dark / light / high-contrast themes, editor font size, simulator toggles (FPU panel, delayed branching, self-modifying code).
- Command palette (`Ctrl+Shift+P`) with fuzzy search across every action.
- Keyboard shortcuts (F3/F5/F6/F7/Shift+F7/F8/F9, Ctrl+S, Ctrl+O, Ctrl+N, Ctrl+B, Ctrl+J, Ctrl+,, …).
- Tools menu featuring an Instruction Counter (static mnemonic histogram + runtime step count).
- Mobile-friendly read-only mode under 768px viewport.

## Getting Started

WebMARS is published as a static web build and requires no installation to use. Visit the deployed URL — _TBD: Vercel deploy in progress_ — and you can begin writing MIPS assembly in your browser. See [`docs/VERCEL_DEPLOY.md`](./docs/VERCEL_DEPLOY.md) for the deploy walkthrough.

To run the project locally for development, follow the instructions below.

### Prerequisites

- Node.js 20 or later.
- npm 10 or later. Yarn and pnpm are also supported but not officially tested.
- A Chromium-based browser (Chrome, Edge, Brave, Arc) for the full feature set. Firefox works but falls back to download-based saves because the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) is Chromium-only.

### Installation

```powershell
git clone https://github.com/BryanD17/WebMARS.git
cd WebMARS
npm install
```

### Verify the install

```powershell
npm test
```

You should see all tests passing (currently 103). If they don't, the local checkout is broken — fix that before continuing.

### Running the development server

```powershell
npm run dev
```

Vite prints the local URL it picked. By default that is `http://localhost:5173`, but Vite will fall through to `5174`, `5175`, … if 5173 is already in use (a previous dev server, another project), so always read the URL Vite prints rather than assuming the default.

Saving a source file in `src/` triggers an HMR reload in the open browser tab — most edits land in well under a second.

### Building for production

```powershell
npm run build
npm run preview
```

The build output is written to `dist/` and can be served by any static host. `npm run preview` serves that same output locally so you can spot-check the production bundle before deploying. Vercel deploys from the same `npm run build` step — see [`docs/VERCEL_DEPLOY.md`](./docs/VERCEL_DEPLOY.md).

### Other useful scripts

```powershell
npm run typecheck     # strict TypeScript check, no emit
npm run lint          # ESLint across src/ and tests/
npm run test:watch    # vitest in watch mode
```

## Usage

1. Open WebMARS in a modern browser.
2. Paste or type MIPS assembly into the source editor on the left.
3. Click **Assemble** in the top bar. Errors, if any, appear in the status bar with line numbers.
4. Use **Run** to execute the program to completion, or **Step** to advance one instruction at a time.
5. Watch the register file update live in the right panel. Switch tabs to inspect memory or read console output.
6. Use **Reset** to return the simulator to its initial state without re-assembling.

### Example program

```mips
        .data
prompt: .asciiz "Enter a number: "
result: .asciiz "Sum from 1 to N is: "
newline:.asciiz "\n"

        .text
        .globl main
main:
        li      $v0, 4              # syscall: print_string
        la      $a0, prompt
        syscall

        li      $v0, 5              # syscall: read_int
        syscall
        move    $t0, $v0            # N

        li      $t1, 0              # sum
        li      $t2, 1              # i
loop:
        bgt     $t2, $t0, done
        add     $t1, $t1, $t2
        addi    $t2, $t2, 1
        j       loop

done:
        li      $v0, 4
        la      $a0, result
        syscall

        li      $v0, 1              # syscall: print_int
        move    $a0, $t1
        syscall

        li      $v0, 4
        la      $a0, newline
        syscall

        li      $v0, 10             # syscall: exit
        syscall
```

## Architecture

The codebase is organized into two clearly separated layers. The simulator core has no UI dependencies and is fully unit-testable. The React UI layer consumes the core through a small set of hooks.

```
webmars/
  src/
    core/         Lexer, parser, two-pass assembler, instruction
                  definitions, register file, memory model, simulator,
                  syscall handler. Pure TypeScript. No React imports.
    ui/           Layout, control bar, source editor, register and
                  memory panels, console, theme. Imports from core.
    hooks/        Zustand store and the glue connecting ui to core
                  (useSimulator, useAssembler, useTheme).
    examples/     Canonical MIPS example programs.
  tests/          Vitest unit tests for the assembler and simulator,
                  plus golden-program integration tests.
  docs/           PRD, design notes, instruction reference.
```

The dependency direction is enforced: `ui/` imports from `core/`, never the reverse. This keeps the simulator independently testable and lets the UI evolve without risk to the execution model.

### Tech stack

| Layer | Technology |
| --- | --- |
| Framework | React 19 with TypeScript 6 (strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`), CSS custom properties for theme tokens |
| Editor | Monaco Editor (`@monaco-editor/react`) with a custom MIPS Monarch grammar |
| State | Zustand |
| Testing | Vitest |
| CI | GitHub Actions |
| Hosting | Vercel (or GitHub Pages) |

## Testing

```bash
npm run test          # run the unit and integration tests once
npm run test:watch    # run in watch mode
npm run typecheck     # strict TypeScript check, no emit
```

The test suite includes:

- Unit tests for the lexer, parser, and assembler.
- Per-instruction simulator tests covering correct semantics, sign extension, and edge cases.
- Golden-program integration tests that assemble and run canonical MIPS programs and verify final register, memory, and console state against expected output.

Cross-checking simulator output against the original MARS for the same input is part of our verification process. Any discrepancy is treated as a bug in WebMARS unless it is the result of a feature explicitly listed as out of scope.

## Supported Instruction Set

**Arithmetic and logical:** `add`, `addu`, `sub`, `subu`, `addi`, `addiu`, `and`, `or`, `xor`, `nor`, `andi`, `ori`, `xori`, `sll`, `srl`, `sra`, `sllv`, `srlv`, `srav`, `slt`, `slti`, `sltu`, `sltiu`, `mult`, `multu`, `div`, `divu`, `mfhi`, `mflo`, `mthi`, `mtlo`, `lui`.

**Memory:** `lw`, `sw`, `lh`, `lhu`, `sh`, `lb`, `lbu`, `sb`.

**Branch and jump:** `beq`, `bne`, `bgtz`, `bltz`, `blez`, `bgez`, `j`, `jal`, `jr`, `jalr`.

**Trap (Phase 2F):** `teq`, `tne`, `tlt`, `tltu`, `tge`, `tgeu`. Each raises a runtime error when its condition holds.

**FPU — coprocessor 1, single-precision (Phase 2B):** `add.s`, `sub.s`, `mul.s`, `div.s`, `sqrt.s`, `abs.s`, `mov.s`, `neg.s`, `cvt.s.w`, `cvt.w.s`, `c.eq.s`, `c.lt.s`, `c.le.s`, `bc1f`, `bc1t`, `mtc1`, `mfc1`, `lwc1`, `swc1`. The FPU panel in the right inspector is gated behind a settings toggle.

**Pseudo-instructions:** `li`, `la`, `move`, `blt`, `ble`, `bgt`, `bge`, `neg`, `not`, `nop`.

**Syscalls:** `1` (print int), `4` (print string), `5` (read int), `8` (read string), `10` (exit), `11` (print char), `12` (read char), `30` (system time), `32` (sleep), `41` (random int), `42` (random int range), `50` (confirm dialog), `51` (input int dialog), `53` (input string dialog), `54` (message dialog).

## Limitations

WebMARS is intentionally scoped. The following are known limitations of v1.0 and are not bugs.

- The MARS Tools menu (bitmap display, keyboard / MMIO simulator, cache simulator, memory reference visualization) is not implemented. Only the Instruction Counter from that menu ships.
- No `.include` or macros, and no multi-file projects in the assembler sense — multi-file is editor-only.
- FPU support is single-precision only. Double-precision (`.d` ops) and coprocessor 0 (`$status`, `$cause`, `$epc`, `mfc0`/`mtc0`/`eret`) are out of scope.
- Branch-delay-slot semantics are off by default for teaching clarity. Real-MIPS delay-slot behavior can be opted into via Settings → Simulator → "Delayed branching"; when on, `jal`/`jalr` save PC+8 to skip the delay slot.
- Self-modifying code is rejected by default (any store into the `.text` segment throws). Settings → Simulator → "Self-modifying code allowed" lifts the guard.
- Pipeline timing, hazards, forwarding, and cache effects are not modeled. Instruction execution is sequential and atomic.
- The `Confirm` dialog syscall (50) collapses MARS's three-state response (Yes / No / Cancel) to two states (OK → Yes, Cancel → No) because it uses the native `window.confirm`.
- Browser persistence is `localStorage`-only — layout, theme, recent files, breakpoints, and run speed survive a reload, but source code itself is not auto-saved. Use File → Save (or `Ctrl+S`) before closing the tab.
- The File System Access API used for native Open / Save is Chromium-only. Firefox falls back to `<input type="file">` and a blob download.

## Contributing

This project is being developed as a final project for a single course and is not currently accepting external contributions. Once v1.0 ships, that policy may change.

If you find a bug or have a suggestion, please open an issue.

### Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/). Common prefixes:

- `feat:` a new feature.
- `fix:` a bug fix.
- `docs:` documentation only.
- `test:` adding or correcting tests.
- `refactor:` code change that neither fixes a bug nor adds a feature.
- `chore:` tooling, CI, dependency updates.

### Branching

Feature branches are cut from `main` and merged via pull request. CI must pass before merge.

## Team

| Name | Role |
| --- | --- |
| Landon Clay | Assembler and parser |
| Zachary Gass | Simulator and execution |
| Bryan Djenabia | UI, integration, and deployment |

## Acknowledgements

WebMARS is inspired by, and built as a tribute to, the original MARS simulator developed by Pete Sanderson and Kenneth Vollmar. We are not affiliated with the original project. Their work has supported MIPS assembly education for over two decades and remains the standard against which we measure correctness.

## AI tools used

This project was developed with the assistance of Claude Code
(Anthropic), used as a code-generation and pair-programming tool.

The development pattern was: I authored the project plan, the PRD,
the architecture decisions, the design tokens, the multi-agent
execution prompts, and the review of every change before it landed
on a branch. Claude Code generated the corresponding implementation
under those instructions and committed on my behalf.

All commits in this repository are authored under my git identity
because I planned, directed, reviewed, and accept responsibility for
the work. This disclosure exists so that the use of AI tooling is
part of the public record of the project.

Where Claude Code's contribution is meaningful enough to credit
specifically, individual commit messages or pull request bodies note
it. The full Day 1 plan and execution prompts that drove the AI-
generated portions are tracked in `docs/` for transparency.

## License

MIT. See [LICENSE](./LICENSE) for the full text.
