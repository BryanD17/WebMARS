# WebMARS

A modern, browser-based MIPS Assembler and Runtime Simulator.

WebMARS is a functional re-implementation of the core features of the original [MARS](https://courses.missouristate.edu/KenVollmar/MARS/) simulator, rebuilt as a web application. It is designed for students learning MIPS assembly who want a clean, fast, installation-free alternative to the original Java Swing tool.

The project is built in TypeScript with React, Vite, and Tailwind CSS, and runs entirely in the browser.

## Status

Active development. Targeting v1.0 for the end of the two-week project window.

See [the PRD](./docs/PRD.md) for the full scope, timeline, and roadmap.

## Features

The v1.0 release targets the workflows students rely on most.

### Core

- Source editor with MIPS syntax highlighting (Monaco).
- Two-pass MIPS32 assembler covering roughly forty instructions, including arithmetic, logical, branch, jump, and load/store operations.
- Pseudo-instruction support for `li`, `la`, `move`, `blt`, `ble`, `bgt`, `bge`, and others.
- Instruction-set simulator with a full 32-register file, HI/LO registers, program counter, and a configurable text/data/stack memory layout.
- Step, Run, Reset, and Stop controls.
- Live register file panel with change highlighting.
- Memory inspector with hex and ASCII views.
- Console panel supporting the standard MARS syscalls: `print_int` (1), `print_string` (4), `read_int` (5), `read_string` (8), and `exit` (10).
- Clear assembly and runtime error messages with line numbers.

### Planned

- Inline error highlighting in the editor.
- Dark mode with persisted preference.
- Click-to-set breakpoints in the editor gutter.
- Save and load source files from the local machine.
- A small library of canonical example programs.

## Getting Started

WebMARS is published as a static web build and requires no installation to use. Visit the deployed URL (link to be added at v1.0) and you can begin writing MIPS assembly in your browser.

To run the project locally for development, follow the instructions below.

### Prerequisites

- Node.js 20 or later.
- npm 10 or later. Yarn and pnpm are also supported but not officially tested.

### Installation

```bash
git clone https://github.com/<your-org>/webmars.git
cd webmars
npm install
```

### Running the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

### Building for production

```bash
npm run build
npm run preview
```

The build output is written to `dist/` and can be served by any static host.

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
| Framework | React 18 with TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Editor | Monaco Editor (`@monaco-editor/react`) |
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

The instruction list below defines the v1.0 target. Anything outside this list is considered a stretch feature.

**Arithmetic and logical:** `add`, `addu`, `sub`, `subu`, `addi`, `addiu`, `and`, `or`, `xor`, `nor`, `andi`, `ori`, `xori`, `sll`, `srl`, `sra`, `slt`, `slti`, `sltu`, `mult`, `div`, `mfhi`, `mflo`.

**Memory:** `lw`, `sw`, `lb`, `sb`, `lh`, `sh`, `lui`.

**Branch and jump:** `beq`, `bne`, `bgtz`, `bltz`, `blez`, `bgez`, `j`, `jal`, `jr`, `jalr`.

**Pseudo-instructions:** `li`, `la`, `move`, `blt`, `ble`, `bgt`, `bge`, `neg`, `not`.

**Syscalls:** `1` (print_int), `4` (print_string), `5` (read_int), `8` (read_string), `10` (exit).

## Limitations

WebMARS is intentionally scoped. The following are known limitations of v1.0 and are not bugs.

- No support for the MARS Tools menu (bitmap display, keyboard simulator, cache simulator, etc.).
- No multi-file projects, no `.include`, no macros.
- No floating-point register file or floating-point instructions in v1.0.
- No persistence beyond `localStorage` for editor preferences. Source code is not auto-saved.
- The simulator does not model branch delay slots or pipeline timing. Instruction execution is sequential and atomic.

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

## License

MIT. See [LICENSE](./LICENSE) for the full text.
