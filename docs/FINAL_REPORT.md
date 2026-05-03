# WebMARS Final Report

**Project:** WebMARS, a browser-based MIPS Assembler and Runtime Simulator
**Repository:** https://github.com/BryanD17/WebMARS
**Tag:** v1.0
**Authors:** Bryan Djenabia, Landon Clay, Zachary Gass
**Submission date:** May 3, 2026

---

## 1. Motivation

The original MARS simulator from Missouri State has been the standard tool for teaching MIPS assembly for over twenty years. It works, but it ships as a Java Swing application that students need to download, install, and reinstall on every machine they touch. In a one-semester computer architecture course this overhead is a real problem. Students lose lab time to JRE version mismatches, install failures on locked-down school computers, and the basic fact that a Swing user interface from 2003 looks and feels nothing like the editors they use everywhere else.

WebMARS removes that friction. The application runs entirely in the browser, requires no install, and presents a layout that resembles the modern code editors students already know from tools like VS Code. The goal was to keep the educational model of MARS (a deliberate, clear MIPS32 simulator with full visibility into registers, memory, and the running program) while updating the surface that students actually interact with.

We targeted the workflows that real coursework requires: write assembly, see syntax errors marked in place, assemble, step through one instruction at a time, watch register changes flash, set breakpoints, run to completion, and read printed output. Anything beyond that core loop was treated as a stretch goal and evaluated against time remaining at the end of each day.

## 2. Architecture

The codebase splits into two layers with a strict dependency direction. The simulator core has no React imports and is fully unit-testable. The React user interface consumes the core through a small set of hooks that hold the Zustand store.

```
src/
  core/         Lexer, parser, two-pass assembler, instruction
                definitions, register file, memory model, simulator,
                syscall handler. Pure TypeScript.
  ui/           Layout, panels, editor, theme. Imports from core.
  hooks/        Zustand store. The glue between core and ui.
  examples/     Bundled MIPS programs imported as raw text.
  tests/        Vitest unit and integration tests.
```

The contract types live in `src/hooks/types.ts` and were frozen on Day 1. Every feature added after that preserved the contract. New state was added as additional slices on the Zustand store rather than by changing the existing shape. This let us extend the engine and the user interface in parallel without breaking either side.

The technology stack is React 19 with TypeScript 6 (strict, with `noUncheckedIndexedAccess` and `verbatimModuleSyntax` enabled), Vite 8 as the build tool, Tailwind v4 for styling through a CSS variables bridge, the Monaco editor via `@monaco-editor/react`, Zustand for state, and Vitest for tests. Continuous integration runs on GitHub Actions. Production deploys to Vercel.

The simulator is a class with private state for the register file, memory, FPU registers, the FCSR condition flag, the program counter, and a step count. It exposes synchronous getters (`getState`, `getFpuState`) that return immutable snapshots, and an asynchronous `step` method that advances one instruction. The store calls `step` from its run loop and pushes each new snapshot into Zustand, where it triggers React re-renders only for the panels subscribed to the slices that actually changed.

Memory is a single contiguous `ArrayBuffer` segmented into text, data, and stack regions. A monkey-patched write hook records prior word values into a circular history buffer of 200 entries so the Backstep button can rewind not only register state but the memory writes that took place during the step being undone.

## 3. What We Built

The shipped feature set covers every must-have in the PRD plus all six listed stretch goals. Below is the work organized by area.

**Editor and assembler.** Monaco editor with a custom MIPS Monarch grammar covering registers (`$zero` through `$ra`, `$f0` through `$f31`, and numeric forms), directives, mnemonics, labels, comments, and string literals with escape support. Hover documentation covers every supported mnemonic. The two-pass assembler handles roughly fifty instructions across arithmetic, logical, branch, jump, load and store, FPU, and trap families, plus pseudo-instructions (`li`, `la`, `move`, `blt`, `ble`, `bgt`, `bge`, `neg`, `not`, `nop`). Assembler errors surface as red squiggles in the editor and as clickable entries in the Problems panel that jump the cursor to the offending line.

**Runtime and debugging.** The standard control set (Run, Step, Reset) plus Pause, Backstep, and Run-to-cursor. A speed slider throttles the run loop between one and five hundred instructions per second, with an unlimited setting at the top of the range. Click-to-set breakpoints in the editor gutter persist per file in `localStorage`. Backstep keeps a circular history of register, FPU, and memory snapshots so the user can undo recent steps and watch the memory inspector revert each store.

**Inspector panels.** The right pane holds Registers, Memory, and (when enabled in settings) the FPU. The register table shows all 32 general-purpose registers grouped by their ABI role plus PC, HI, and LO, with toggleable hex, decimal, and binary views. Memory shows an 8 by 8 word grid with an address jump field, a segment toggle for text, data, and stack, edit-in-place during pause, and a brief flash animation on each write. The FPU panel shows `$f0` through `$f31` in both float and bit forms along with the FCSR cc[0] flag.

**File system.** Multi-file tabs with drag-to-reorder, a right-click context menu, and an Open Recent submenu that lists the last ten opened files. The File System Access API handles native open and save dialogs in Chromium browsers. Firefox falls back to a standard download. A `beforeunload` handler blocks accidental tab closes when any file is unsaved.

**Settings, commands, keyboard.** A settings dialog with three theme variants (dark, light, high contrast), an editor font size slider, and three simulator toggles (FPU panel visibility, delayed branching, self-modifying code). A command palette (`Ctrl+Shift+P`) provides fuzzy search across every action in the application. Keyboard shortcuts cover the standard editor and runtime operations: F3 assemble, F5 run, F6 pause, F7 step, Shift+F7 backstep, F8 run to cursor, F9 toggle breakpoint, plus Ctrl+S save, Ctrl+O open, Ctrl+N new, Ctrl+, settings, and the layout toggles.

**Engine extensions.** Phase 2B added the FPU register file and twenty coprocessor 1 instructions covering single-precision arithmetic, comparison, branch, conversion, and load and store. Phase 2C added optional real-MIPS branch-delay-slot semantics behind a settings toggle. Phase 2D added a guard against self-modifying code that throws a runtime error on stores into the text segment unless the user opts in. Phase 2E added eight syscalls beyond the original five (print char, read char, system time, sleep, random int, random int with range, confirm dialog, message dialog). Phase 2F added the six R-type trap instructions (`teq`, `tne`, `tlt`, `tltu`, `tge`, `tgeu`). Phase 2G fixed an existing `addiu` and `sltiu` sign-extension bug found while testing trap instructions. Phase 2H added two input dialog syscalls (read int dialog and read string dialog).

**Tests.** 103 tests across 11 files cover the assembler, simulator, memory, registers, syscalls, FPU, traps, delayed branching, self-modifying code guard, sign extension, and the full golden program suite. Every commit on every pull request ran clean against the suite.

The production bundle ships at roughly 345 KB of JavaScript (101 KB gzipped) plus 53 KB of CSS.

## 4. What We Cut

Some items were out of scope by intent in the original PRD. Others were deferred when the calendar tightened toward submission.

**Out by design.** The MARS Tools menu (bitmap display, memory-mapped IO and keyboard simulator, cache simulator, memory reference visualization) was excluded with the exception of the Instruction Counter, which we did ship. Macros, `.include` directives, and multi-file behavior at the assembler level were excluded. The multi-file user interface is editor-only and each file assembles independently. Server-side persistence, account systems, and shareable program links were excluded.

**Deferred for the v1.0 cut.** Coprocessor 0 (the `$status`, `$cause`, and `$epc` registers along with `mfc0`, `mtc0`, and the `eret` instruction) is missing. This means WebMARS cannot demonstrate exception handling, which some advanced courses cover. Double-precision FPU operations (the `.d` family) are missing because the engine's paired-register handling for double-precision needs a careful implementation pass that we did not have time for. Pipeline timing, hazard detection, forwarding, and cache effects are not modeled at all. Instruction execution is sequential and atomic.

**Smaller compromises.** The syscall 50 confirm dialog uses the native `window.confirm` and so collapses MARS's three-state response (Yes, No, Cancel) into two states (OK to Yes, Cancel to No). A custom three-button modal would restore the third state but was deprioritized. Source code is not auto-saved. Only layout, theme, recent files, breakpoints, and run speed survive a reload. The pre-existing assembler's branch-offset arithmetic relies on a small quirk in how the simulator increments the program counter, which we documented in code comments but did not refactor.

## 5. What We Would Do Next

The natural next phase is coprocessor 0 support. Adding `$status`, `$cause`, `$epc`, the `mfc0` and `mtc0` instructions, and the `eret` return-from-exception path would let instructors teach interrupt and exception handling in WebMARS. The work fits the same pattern as the FPU panel that shipped in Phase 2B: a new simulator method that returns a snapshot, a new accordion section in the right panel gated by a settings toggle, and a small set of new mnemonics in the Monarch grammar and reference table.

Double-precision FPU support is the next gap in the instruction set. The `.d` operations need paired-register handling, a second comparison flag set, and parser updates for double-precision literals. The engine's existing reinterpret-cast helpers in `src/core/registers.ts` can extend cleanly to 64 bits.

Beyond instruction set work, the Tools menu has obvious additions. A cache simulator that visualizes hit and miss patterns against a configurable cache geometry would teach a concept that is hard to see from a text register table. A memory reference visualization that plots each load and store as a heatmap over the address space would do the same for locality.

Quality-of-life items include a custom three-button modal to replace the native `window.confirm` so syscall 50 returns the proper Cancel state, auto-save of source code into IndexedDB so power loss does not lose work, and shareable program links that encode the source as a query parameter so instructors can post examples that open ready to run.

The test suite would benefit from a property-based pass against a reference MIPS interpreter, comparing register state after each step on randomly generated programs. This would catch the kind of edge cases that hand-written tests miss. The `addiu` sign-extension bug we found during Phase 2G is a good example: it had been in the engine since Day 2 and went undetected through every existing test because no test happened to use a negative immediate with that specific instruction.

Finally, the deployed Vercel build needs to land before the project is fully delivered. The configuration already exists. The remaining work is mechanical: connect the GitHub repository to a Vercel project, confirm the build command and output directory, and update the README link from its current placeholder to the live URL.
