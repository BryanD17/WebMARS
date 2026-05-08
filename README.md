# WebMARS

A modern, browser-based MIPS Assembler and Runtime Simulator.
**Live at [webmarsimulator.com](https://www.webmarsimulator.com/).**

## What it is

WebMARS is a complete MIPS development environment — assembler, simulator,
debugger, and visual tools — running entirely in the browser. It is a
re-implementation of the curriculum-standard
[MARS](https://dpetersanderson.github.io/) simulator,
rebuilt as a web app so students don't have to fight Java installs.
Built in TypeScript with React 19, Vite, Tailwind, Monaco, and Zustand.

## Quick links

- Live editor — <https://www.webmarsimulator.com/>
- About page — <https://www.webmarsimulator.com/about>
- GitHub — <https://github.com/Webmarssimulator/WebMARS>
- Report a bug — <https://github.com/Webmarssimulator/WebMARS/issues>
- PRD — [`docs/PRD.md`](./docs/PRD.md)
- Final report — [`docs/FINAL_REPORT.md`](./docs/FINAL_REPORT.md)

## Demo video

A short walkthrough of the editor, debugger, and Tools menu:

[![Watch the WebMARS demo on YouTube](https://img.youtube.com/vi/gSC3Dp6CAkQ/maxresdefault.jpg)](https://www.youtube.com/watch?v=gSC3Dp6CAkQ)

---

## Getting started (Usage)

*For students and educators who want to use WebMARS.*

Just visit <https://www.webmarsimulator.com/>. No install required.

### Writing your first program

1. Click **File → Examples → Hello, MIPS!** (or any other example).
2. Click **Assemble** in the toolbar (or press `F3`).
3. Click **Run** (or press `F5`).
4. Output appears in the Console at the bottom.

### Common workflows

- **Open a file from your computer** — File → Open. Chromium browsers
  use the native picker; Firefox falls back to a download dialog on save.
- **Save your work** — File → Save (or `Ctrl+S`). Files stay on your
  machine; nothing is uploaded.
- **Set a breakpoint** — click in the gutter to the left of any line.
  Hover the gutter for a low-opacity preview before you click.
- **Step through code** — `F7` advances one instruction. `Shift+F7`
  rewinds (yes, you can step backward).
- **Run to cursor** — place the cursor on a line, press `F8`.
- **Inspect state** — the right inspector shows the register file
  (with per-step change highlighting) and a memory view with `.text`
  / `.data` / stack toggles. The FPU panel can be enabled in Settings.
- **Open the Tools menu** — Bitmap Display, Keyboard/Display MMIO,
  IEEE 754 Representation, Memory Reference Visualization, Screen
  Magnifier, and Instruction Counter.

### Keyboard shortcuts

Press `F1` anywhere in the editor for the full reference. Highlights:

| Action | Shortcut |
|---|---|
| Help dialog | `F1` |
| Assemble | `F3` |
| Run | `F5` |
| Pause | `F6` |
| Step | `F7` |
| Backstep | `Shift+F7` |
| Run to cursor | `F8` |
| Toggle breakpoint | `F9` |
| Save | `Ctrl+S` |
| Open | `Ctrl+O` |
| New | `Ctrl+N` |
| Find / Replace | `Ctrl+F` / `Ctrl+H` |
| Goto line | `Ctrl+G` |
| Settings | `Ctrl+,` |
| Command palette | `Ctrl+Shift+P` |

### Browser support

Modern Chrome, Edge, Firefox, and Safari. The File System Access API
for direct file open/save is Chromium-only; Firefox and Safari fall
back to download dialogs on save. All other features work everywhere.

---

## Self-installation (Developers)

*For developers who want to fork, modify, or run the project locally.*

### Prerequisites

- Node.js 20 or later
- npm 10 or later (bundled with Node)
- Git

### Setup

```bash
git clone https://github.com/Webmarssimulator/WebMARS.git
cd WebMARS
npm install
npm run dev
```

Vite prints the local URL. By default it's `http://localhost:5173`,
but Vite falls through to `5174`, `5175`, … if 5173 is taken.

### Available scripts

```bash
npm run dev          # start dev server with HMR
npm run build        # production build to dist/
npm run preview      # serve the production build locally
npm run typecheck    # strict TypeScript check (no emit)
npm run lint         # ESLint across src/ and tests/
npm run test         # run Vitest once
npm run test:watch   # Vitest in watch mode
```

### Architecture

```
src/
  core/        Lexer, parser, two-pass assembler, instruction
               definitions, register file, memory, simulator,
               syscall handler. Pure TypeScript. No React imports.
  hooks/       Zustand store and the glue between ui and core.
  ui/          IDE shell, all panels and dialogs.
  landing/    /about marketing landing page (lazy-loaded).
  lib/         Router, file I/O, MIPS Monarch grammar, constants.
  examples/    Bundled .asm starter programs.
tests/         Vitest unit and golden-program integration tests.
docs/          PRD, final report, demo script, deploy notes.
```

The dependency direction is enforced: `ui/` imports from `core/`,
never the reverse. The simulator core has no UI dependencies and is
fully unit-testable. Routing is a 30-line History API wrapper in
`src/lib/router.ts` — no router library.

The full instruction-set reference (~50 instructions across R/I/J,
FPU single-precision, and trap families, plus pseudo-instructions
and syscalls) is available in-app via the `F1` Help dialog. See
[`docs/PRD.md`](./docs/PRD.md) for the architecture deep-dive and
the explicit out-of-scope list (double-precision FPU, coprocessor 0,
pipeline / cache modeling, `.include` / macros, multi-file assembly,
`html2canvas`-style screen magnification).

### Contributing

This is a course project; external contributions aren't accepted
until v2.0. Bug reports via GitHub Issues are welcome.

If you fork: open a pull request against `main`. Run `typecheck`,
`lint`, and `test` before pushing — CI runs all three on every push.
Conventional Commits style for messages (`feat:`, `fix:`, `docs:`,
`refactor:`, `chore:`, `test:`).

---

## Team

Three engineers built this in 2026:

- **Bryan Djenabia** — UI, integration, deployment
- **Landon Clay** — Assembler and parser
- **Zachary Gass** — Simulator and execution

## License

MIT. See [LICENSE](./LICENSE) for the full text.

## Acknowledgements

Inspired by [MARS](https://dpetersanderson.github.io/)
by Pete Sanderson and Kenneth Vollmar at Missouri State University.
WebMARS is an independent re-implementation, not a fork. Their work
has supported MIPS education for over two decades and remains the
standard we verify correctness against.

## AI tools used

This project was developed with the assistance of Claude Code
(Anthropic) as a pair-programming tool. All commits are authored under our git
identity because we planned, directed, coded, reviewed, and accept
responsibility for the work. The Day 1 plan and execution prompts
are tracked in `docs/` for transparency.
