# Product Requirements Document

## WebMARS — A Modern, Browser-Based MIPS Assembler & Runtime Simulator

**Final Project | Custom Project (Option 4) | 6-Day Final Sprint**

| Field | Value |
| --- | --- |
| Team | TBD — see Section 1.2 for suggestions |
| Members | Landon Clay, Zachary Gass, Bryan Djenabia |
| Project Type | Option 4 — Custom Project (Approved) |
| Duration | 6 days — Tue Apr 28 → Sun May 3, 2026 |
| Final deadline | **Sunday, May 3, 2026** (all deliverables due) |
| Status | Draft v1.1, schedule compressed to single sprint |

---

## 1. Overview

### 1.1 Problem Statement

MARS (MIPS Assembler and Runtime Simulator) has been the de-facto teaching tool for MIPS assembly programming for over two decades. Its instructional value is well established, but its Java Swing user interface is increasingly a barrier to learning. Students in our own coursework regularly cite the cluttered layout, dated controls, and friction of installing a Java runtime as obstacles that distract from the underlying material.

The pedagogy is sound. The interface is not. We believe a modern, browser-based front end, with no installation, no Java, and a layout designed around how students actually work in 2026, would meaningfully improve the learning experience without sacrificing any of MARS's educational depth.

### 1.2 Project Name & Branding

Naming should communicate what the tool is (a MIPS simulator) and what makes it different (it runs in the browser).

| Name | Repo Slug | Rationale |
| --- | --- | --- |
| **WebMARS** *(recommended)* | `webmars` | Direct evolution of the brand students already know. Communicates the core change (web) without abandoning the lineage. Easy to search, easy to cite in a paper or README. |
| MARS.next | `mars-next` | Signals a successor or next-generation tool. Reads well in marketing copy but slightly awkward as a CLI or import name. |
| OrbitMIPS | `orbit-mips` | Original brand, plays on the MARS / orbit theme. More distinctive but loses recognition with instructors familiar with MARS. |
| MIPSPad | `mipspad` | Emphasizes the editor-first feel. Short and friendly. Risks sounding like a toy rather than a simulator. |

**Recommendation:** Use *WebMARS* as the project name and `webmars` as the GitHub repository slug. Team-name suggestions to match: *Orbital*, *Bytecode Trio*, or *Register Set*.

### 1.3 Goals

- Deliver a functionally equivalent subset of MARS that runs entirely in a modern web browser, with no installation step.
- Provide a clean, single-pane interface that lets a student write, assemble, run, and debug a MIPS program without context-switching.
- Match or exceed MARS on the workflows students perform most often: editing source, stepping through instructions, inspecting registers and memory, and reading console output.
- Ship a polished, demoable product by **Sunday, May 3, 2026**, with a clearly defined core scope and well-separated stretch goals.

### 1.4 Non-Goals

- Full bit-for-bit parity with every MARS feature. Tools like the bitmap display, keyboard simulator, and full MIPS64 support are explicitly out of scope.
- Multi-file projects, linker support, or custom ELF generation. The simulator operates on a single source buffer.
- Cloud sync, accounts, or persistent server-side storage. The application is fully client-side.
- A mobile-first experience. The tool targets desktop and laptop browsers; phone layout is a stretch consideration only.

---

## 2. Target Users & Use Cases

### 2.1 Primary User

An undergraduate computer architecture or assembly-language student, working through MIPS exercises on their laptop. They are comfortable with a code editor, want to spend their time understanding instructions and memory, and are frustrated when their tools get in the way.

### 2.2 Core Use Cases

1. Open the site in a browser, paste in a MIPS program from a homework prompt, click **Assemble**, and see whether it builds.
2. Step through the program one instruction at a time while watching the register file update in real time.
3. Set a breakpoint on a specific line, run to it, and inspect a region of data memory.
4. Run a program that uses syscalls (print integer, print string, read integer, exit) and see the I/O appear in a console panel.
5. Hit a syntax or runtime error and see exactly which line caused it, with a useful message.

---

## 3. Functional Scope

### 3.1 Core Features (Must-Have)

These define a successful, demoable v1.0. Every feature in this section must work end-to-end before any stretch goal is started.

| Feature | Definition of Done |
| --- | --- |
| Source editor with MIPS syntax highlighting | Monaco-based editor recognizes MIPS keywords, registers, directives, comments, and string literals. Basic find/replace works. |
| Two-pass MIPS32 assembler | Translates a defined subset of MIPS32 (~40 instructions covering arithmetic, logical, branch, jump, and load/store) into 32-bit machine code. Resolves labels and pseudo-instructions (`li`, `la`, `move`, `blt`, etc.). |
| Instruction-set simulator | Executes assembled instructions correctly against a simulated 32-register file and a configurable memory space (text, data, stack segments). |
| Step / Run / Reset controls | User can run the entire program, step a single instruction, reset to initial state, and stop a running program. |
| Live register file panel | All 32 general-purpose registers plus PC, HI, LO are visible. Registers that change on the most recent step are highlighted. |
| Memory inspector | User can scroll or jump to an address and view memory in hex and ASCII. Updates as the program runs. |
| Console / I/O panel | Standard MARS syscalls supported at minimum: `print_int` (1), `print_string` (4), `read_int` (5), `read_string` (8), `exit` (10). |
| Error reporting | Assembly and runtime errors produce a clear message with line number. The user is never left guessing where a crash happened. |

### 3.2 Stretch Features (Nice-to-Have)

Pursued only after every Core Feature is complete and tested. Listed in priority order.

1. Inline error highlighting in the editor (red squiggle on the offending line, hover for the message).
2. Dark mode toggle, with preference saved to `localStorage`.
3. Click-to-set breakpoints in the editor gutter.
4. Save / load source files to and from the user's machine.
5. Example-program library (a handful of canonical MIPS examples accessible from a menu).
6. Floating-point register file and FP instruction subset.

### 3.3 Out of Scope

- MARS's Tools menu (bitmap display, keyboard/MMIO simulator, cache simulator, etc.).
- Macros, `.include`, and other multi-file features.
- Self-modifying code support beyond what the basic simulator naturally allows.
- Authentication, server-side persistence, sharing links.

---

## 4. Technical Approach

### 4.1 Stack

| Layer | Choice & Rationale |
| --- | --- |
| Framework | React 18 + TypeScript, scaffolded with Vite. Standard, fast, excellent TS support, minimal config. |
| Styling | Tailwind CSS for layout and theming; CSS variables to support a dark-mode toggle. |
| Code editor | Monaco Editor (the editor that powers VS Code), via `@monaco-editor/react`. Custom MIPS tokenizer for syntax highlighting. |
| Assembler & simulator | Pure TypeScript modules with no external runtime dependencies. Lives in a `/core` directory and is unit-tested with Vitest. |
| State management | Zustand. Lightweight, well-suited to a simulator's frequent state updates, no Redux ceremony. |
| Testing | Vitest for assembler/simulator unit tests. A small set of golden MIPS programs serve as integration tests. |
| Hosting | Vercel or GitHub Pages. Both deploy a Vite build with zero configuration. |

### 4.2 Note on the Original React Native Proposal

The approved proposal listed React Native as the framework. The team has since switched to plain React (web) for the v1.0 build, for three reasons:

- React Native targets native iOS and Android apps, not the web. The web variant ("React Native for Web") exists but adds friction without benefit for a desktop-style developer tool.
- The MIPS workflow assumes a real keyboard, multiple panes, and a wide viewport — patterns that the web platform handles natively and that React Native is not optimized for.
- Library support for the components we need most (a code editor, resizable panels) is mature on web React and effectively absent on React Native.

The user-facing pitch (browser-based, no Java, modern UI) is unchanged. This change will be surfaced to the instructor before kickoff so it is approved on the record.

### 4.3 Architecture (High Level)

The codebase is split into two cleanly separated layers: a pure simulator core with no UI dependencies, and a React UI layer that consumes it through a small set of hooks.

- **`/core`** — Lexer, parser, two-pass assembler, instruction definitions, simulator (register file, memory, syscall handler). Zero React imports. Fully unit-testable.
- **`/ui`** — Layout, panels (Editor, Registers, Memory, Console), control bar, theme. Imports from `/core`; never the other way around.
- **`/hooks`** — Zustand store and the thin glue that drives `/core` from `/ui` (`useSimulator`, `useAssembler`, `useTheme`).

This split is non-negotiable. It is what lets us write tests for the assembler without mounting React, and it is what lets us swap or upgrade the UI later without touching simulator code.

---

## 5. User Interface

### 5.1 Layout

A single-page, three-region layout, sized for a typical 1280×800 laptop screen and up. No modals for primary actions, no hidden menus for the main workflow.

- **Top bar:** App name, primary action buttons (Assemble, Run, Step, Reset, Stop), theme toggle.
- **Left pane:** Source editor. Takes ~60% of the horizontal space.
- **Right pane:** Tabbed inspector with three tabs: Registers (default), Memory, and Console. ~40% horizontal.
- **Status bar:** Assemble status, current PC, cycle count, error messages.

### 5.2 Design Principles

- **Information density over decoration.** Students need to see registers and memory; they do not need illustrations.
- **Keyboard-first.** Every primary action has a shortcut (Cmd/Ctrl+B for Assemble, F10 for Step, etc.).
- **State is always visible.** The user should never wonder whether the program assembled, where the PC is pointing, or whether they're paused.
- **The tool should look like a piece of professional software**, not a class project.

---

## 6. 6-Day Action Plan (Tue Apr 28 → Sun May 3, 2026)

Six calendar days, single compressed sprint, ending in submission on **Sunday, May 3, 2026**. The plan assumes work already in flight: Landon's Day 1–4 lexer/parser/assembler draft (commit `36c14fd`, currently being cleaned up per issue #2) and Bryan's docs and repo setup. Roles below are starting assignments; pair programming and mid-week swaps are expected.

### 6.1 Roles

| Owner | Responsibilities |
| --- | --- |
| **Landon Clay** | Assembler / parser owner. Drives the `src/core` lexer, parser, and two-pass assembly logic. Owns the instruction-table and pseudo-instruction expansion. |
| **Zachary Gass** | Simulator owner. Drives the register file, memory model, instruction execution, and syscall handler. Owns the unit-test golden programs. |
| **Bryan Djenabia** | UI / integration owner. Drives the Vite scaffold, layout, editor integration, panels, and the Zustand store that bridges UI and core. Owns the deployed build. |

### 6.2 Daily breakdown

**Goal:** by end of Day 4 (Fri May 1) a user can paste a MIPS program, click Run, and see registers update; Days 5–6 are polish, demo prep, and submission.

| Day | Date | Assembler (Landon) | Simulator (Zachary) | UI / Integration (Bryan) |
| --- | --- | --- | --- | --- |
| 1 | Tue Apr 28 | Cleanup pass on Day 1–4 draft (issue #2): convert assembler to TypeScript, move files into `src/core/`, fix naming, drop binaries, add `.gitignore`. | Register file + memory module (text/data/stack segments); load/store helpers. | Vite + React + TS + Tailwind scaffold; three-pane layout shell; placeholder panels; deploy hello-world to Vercel. |
| 2 | Wed Apr 29 | Finalize lexer + parser; pseudo-instruction expansion (`li`, `la`, `move`, `blt`, `ble`, `bgt`, `bge`); `.data`/`.text`/`.word`/`.asciiz`/`.space` directives. | Execute first 10 instructions (`add`, `sub`, `addi`, `and`, `or`, `lw`, `sw`, `beq`, `j`, `jal`); Step/Run/Reset state machine; PC management. | Monaco editor wired in with basic MIPS tokenizer; Zustand store; control bar buttons fire core actions. |
| 3 | Thu Apr 30 | Two-pass assembler end-to-end: label resolution, machine-code emission, assembler error messages with line numbers. | Remaining core instructions; HI/LO; multiply/divide; syscalls 1, 4, 5, 8, 10 wired through a console interface. | Registers panel: live updates and change highlighting. Memory and Console panels. |
| 4 | Fri May 1 | Integrate parser → assembler → simulator pipeline; fix integration bugs; verify against the 5 golden programs. | Runtime error messages; Vitest pass for sum-1-to-N, factorial, string print, array-sum, syscall I/O. | End-to-end demo build deployed. Status check: every Must-Have in §3.1 minimally functional. |
| 5 | Sat May 2 | Bug-bash from §3.1 punch list; assembler edge cases (sign extension, negative immediates, branch offsets). | Bug-bash; cross-check golden-program output against real MARS. | UI polish: spacing, typography, monospace fonts. Stretch #1 if time: inline error highlighting (Monaco markers). Stretch #2 if time: dark mode. Cross-browser smoke test (Chrome, Firefox, Safari, Edge). README screenshots/GIFs. |
| 6 | Sun May 3 **(due)** | Final assembler regression check. | Final simulator regression check. | Final report drafted; demo script written; team dry-run; tag v1.0 in Git; final deploy locked. **Submit.** |

**Day 4 (Fri May 1) exit criteria — must-haves complete:** a user can paste any of five canonical MIPS programs (sum-1-to-N, factorial, string print, array-sum, simple syscall I/O) and run them to completion with correct output. Every Must-Have feature in §3.1 is at least minimally functional.

**Stretch policy:** stretch goals (§3.2) are pursued only on Day 5 and only in priority order. We stop pursuing stretches at noon on Day 6 regardless of how many we hit, so the afternoon is reserved for submission, deploy lock, and buffer.

---

## 7. Deliverables

- A deployed, publicly accessible web build (e.g., `webmars.vercel.app`) running v1.0.
- A GitHub repository named `webmars` containing all source, tests, and CI configuration, tagged at v1.0.
- A README with screenshots, a quick-start guide, the supported instruction set, and a list of known limitations.
- A short final report (5 pages or less) covering motivation, architecture, what we built, what we cut, and what we'd do next.
- A 5-minute live demo using one of the canonical example programs, ending with a Q&A.

---

## 8. Risks & Mitigations

| Risk | Likelihood / Impact | Mitigation |
| --- | --- | --- |
| Compressed 6-day timeline | High / High | Daily exit criteria in §6.2. Day 4 (Fri May 1) is a hard checkpoint: if Must-Haves aren't complete, Day 5 cuts all stretches and becomes a second integration day. |
| Scope creep ("just one more instruction") | High / High | Instruction list (§10.1) is frozen as of Day 1. New instructions only land if a Core Feature is at risk without them. The parser schema currently overshoots and must be trimmed (issue #2). |
| Subtle MIPS semantics bug (sign extension, branch delay slots) | Medium / High | Golden-program test suite stood up by end of Day 3. Cross-check outputs against real MARS for the same inputs. |
| Monaco / tokenizer rabbit hole | Medium / Medium | Hard time-box: basic MIPS tokenizer is half of Day 2. If incomplete, ship with default highlighting and improve only on Day 5 if Must-Haves are done. |
| Member unavailable mid-sprint | Medium / High | With only 6 days, no slack for absences. Pair-program on Days 1–2 so every layer has a backup author. Daily 10-minute standup catches blockers same-day. |
| Polishing eats time meant for stretch goals | Medium / Low | Stretches are explicitly numbered and pursued in priority order on Day 5 only. Hard stop at noon on Day 6 regardless of how many we hit. |

---

## 9. Definition of Success

WebMARS v1.0 is successful if a student in our class can:

1. Open the URL in any modern browser without installing anything.
2. Paste in a typical homework MIPS program, assemble it, and run it to completion.
3. Step through the program and watch the register file update.
4. Read a clear error message when their code is wrong, with the correct line number.
5. Honestly say the experience was less frustrating than using MARS.

If we can demo all five live, in front of the instructor, the project has succeeded.

---

## 10. Appendix

### 10.1 Initial Instruction Set

Frozen list of instructions targeted for v1.0 (must be complete by Day 4, Fri May 1). All others are stretch.

**Arithmetic / Logical:**
`add`, `addu`, `sub`, `subu`, `addi`, `addiu`, `and`, `or`, `xor`, `nor`, `andi`, `ori`, `xori`, `sll`, `srl`, `sra`, `slt`, `slti`, `sltu`, `mult`, `div`, `mfhi`, `mflo`

**Memory:**
`lw`, `sw`, `lb`, `sb`, `lh`, `sh`, `lui`

**Branch / Jump:**
`beq`, `bne`, `bgtz`, `bltz`, `blez`, `bgez`, `j`, `jal`, `jr`, `jalr`

**Pseudo:**
`li`, `la`, `move`, `blt`, `ble`, `bgt`, `bge`, `neg`, `not`

**Syscalls:**

| Code | Name |
| --- | --- |
| 1 | print int |
| 4 | print string |
| 5 | read int |
| 8 | read string |
| 10 | exit |

### 10.2 Repository Conventions

- Default branch: `main`. Feature branches off `main`, merged via PR.
- Commit style: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- CI: GitHub Actions runs typecheck + Vitest on every PR.
- License: MIT, with attribution in the README to the original MARS project for inspiration.

### 10.3 Open Questions for Instructor

1. Confirm that switching the framework from React Native to React (web) is acceptable, given the user-facing pitch is unchanged.
2. Confirm that the v1.0 instruction subset (Appendix 10.1) is sufficient for the project's grading rubric.
3. Confirm the form of the final deliverable: live demo, written report, or both.

---

*End of Document*
