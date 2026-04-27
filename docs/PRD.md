# Product Requirements Document

## WebMARS — A Modern, Browser-Based MIPS Assembler & Runtime Simulator

**Final Project | Custom Project (Option 4) | Two-Week Sprint**

| Field | Value |
| --- | --- |
| Team | TBD — see Section 1.2 for suggestions |
| Members | Landon Clay, Zachary Gass, Bryan Djenabia |
| Project Type | Option 4 — Custom Project (Approved) |
| Duration | 14 days, two one-week sprints |
| Status | Draft v1.0, pending team review |

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
- Ship a polished, demoable product within the two-week project window, with a clearly defined core scope and well-separated stretch goals.

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

## 6. Two-Week Action Plan

Fourteen calendar days, two one-week sprints. Each sprint ends with a demoable build and a brief written status update. Roles below are starting assignments; pair programming and mid-sprint swaps are fine and expected.

### 6.1 Roles

| Owner | Responsibilities |
| --- | --- |
| **Landon Clay** | Assembler / parser owner. Drives the `/core` lexer, parser, and two-pass assembly logic. Owns the instruction-table and pseudo-instruction expansion. |
| **Zachary Gass** | Simulator owner. Drives the register file, memory model, instruction execution, and syscall handler. Owns the unit-test golden programs. |
| **Bryan Djenabia** | UI / integration owner. Drives the Vite scaffold, layout, editor integration, panels, and the Zustand store that bridges UI and core. Owns the deployed build. |

### 6.2 Sprint 1 (Days 1–7): "Make it work"

**Goal:** a build where you can paste a small MIPS program, click Run, and see the registers update. No polish.

| Day | Assembler (Landon) | Simulator (Zachary) | UI / Integration (Bryan) |
| --- | --- | --- | --- |
| 1 | Repo setup, type defs for tokens & instructions. | Repo setup, register file & memory module skeletons. | Vite + React + TS + Tailwind scaffold; deploy hello-world to Vercel. |
| 2 | Lexer: strings, registers, immediates, labels, comments. | Memory model with text/data/stack segments; load/store helpers. | Three-pane layout shell; placeholder panels. |
| 3 | Parser: produce IR for ~10 core instructions. | Execute first 10 instructions (`add`, `sub`, `addi`, `and`, `or`, `lw`, `sw`, `beq`, `j`, `jal`). | Monaco editor wired in; basic MIPS tokenizer. |
| 4 | Two-pass assembler: label resolution, machine-code emission. | Step/Run/Reset state machine; PC management. | Zustand store; control bar buttons fire core actions. |
| 5 | Pseudo-instructions: `li`, `la`, `move`, `blt`, `ble`, `bgt`, `bge`. | Remaining core instructions; HI/LO; multiply/divide. | Registers panel: live updates, change highlight. |
| 6 | `.data` / `.text` directives, `.word`, `.asciiz`, `.space`. | Syscalls 1, 4, 5, 8, 10 wired through a console interface. | Memory & Console panels. |
| 7 | End-to-end integration; assembler error messages with line numbers. | Integration; runtime error messages; unit-test pass for 5 golden programs. | End-of-sprint demo build deployed; status writeup. |

**Sprint 1 exit criteria:** A user can paste any of five canonical MIPS programs (sum-1-to-N, factorial, string print, array-sum, simple syscall I/O) and run them to completion with correct output. Every "Must-Have" feature in section 3.1 is at least minimally functional.

### 6.3 Sprint 2 (Days 8–14): "Make it good"

**Goal:** take the working v0.5 from Sprint 1 and turn it into something we are proud to demo.

| Day | Focus |
| --- | --- |
| 8 | Bug-bash day. The whole team runs example programs, files issues, triages. No new features. |
| 9 | Top three bugs from Day 8 fixed. UI polish: spacing, typography, monospace fonts. |
| 10 | Stretch goal #1: inline error highlighting (Monaco markers tied to assembler errors). |
| 11 | Stretch goal #2: dark mode with persisted preference. Stretch goal #3 if time: breakpoints. |
| 12 | Cross-browser test (Chrome, Firefox, Safari, Edge). README, screenshots, GIFs. |
| 13 | Final report drafted. Demo script written. Dry-run the demo end-to-end as a team. |
| 14 | Submit. Tag v1.0 in Git. Final deploy locked. Buffer for last-minute fixes only. |

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
| Scope creep ("just one more instruction") | High / High | Frozen instruction list at end of Day 2. New instructions only land if a Core Feature is at risk without them. |
| Subtle MIPS semantics bug (sign extension, branch delay slots) | Medium / High | Golden-program test suite from Day 3. Cross-check outputs against real MARS for the same inputs. |
| Monaco / tokenizer rabbit hole | Medium / Medium | Hard time-box: tokenizer is one day. If incomplete, ship with basic highlighting and improve later. |
| Member unavailable mid-sprint | Medium / Medium | Pair-program in week 1 so every layer has a backup author. Daily 10-minute standup catches blockers early. |
| Polishing eats time meant for stretch goals | Medium / Low | Stretch goals are explicitly numbered and pursued in order. We stop at the end of Day 11 regardless of how many we hit. |

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

Frozen list of instructions targeted for Sprint 1. All others are stretch.

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
