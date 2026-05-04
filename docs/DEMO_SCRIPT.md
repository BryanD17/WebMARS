# WebMARS Demo Script

A walkthrough script for demonstrating WebMARS v1.0 in roughly seven minutes. Designed to be read out loud at a normal speaking pace, with each numbered step describing both the action to take and what to say while taking it.

---

## Setup checklist (do this before starting)

1. Open the deployed Vercel build, or run `npm run dev` and open the URL Vite prints (5173 by default; check the terminal output if another project is using that port).
2. Confirm the default file `hello.asm` is loaded in the editor.
3. Confirm the right inspector is open with the Registers section expanded.
4. Confirm the bottom panel is open and showing the Console tab.
5. If you plan to demo themes, leave the theme on dark to start. The light and high-contrast themes are part of the demo.
6. If you plan to demo the FPU, do not enable the FPU panel yet. The settings dialog is part of the demo.
7. Have one source file with a deliberate typo ready as a backup, in case the inline-error portion of the demo needs a fresh trigger.

Total run time: about seven minutes if you do every section. Each section is independent and can be cut for time.

---

## Section 1: Pitch (about 30 seconds)

**Say:** "WebMARS is a browser-based MIPS assembler and runtime simulator. The original MARS tool from Missouri State has been the standard for teaching MIPS for over twenty years, but it ships as a Java desktop application that students need to install on every machine they use. WebMARS removes that step. It runs entirely in the browser, requires no install, and presents a layout that resembles modern code editors. We built it as a final project for our computer architecture course over a six-day sprint."

**Action:** Gesture to the screen so the audience sees the shell. Do not click anything yet.

---

## Section 2: The default workflow (about 90 seconds)

**Say:** "The default file is a Hello, MIPS program. Let me walk through the standard write, assemble, run loop that students do every day."

**Action 1:** Click **Assemble** in the toolbar.
**Say:** "Assemble runs the two-pass MIPS32 assembler in the core. The status pill in the top right flips to Ready, and you can see in the Messages tab at the bottom that two instructions assembled."

**Action 2:** Click **Run**.
**Say:** "Run executes the program to completion. The Console tab shows the output. You can also see in the right panel that the program counter has advanced and several registers updated."

**Action 3:** Click **Reset**, then click **Step** three times in a row.
**Say:** "Reset returns the simulator to its initial state without re-assembling. Step advances one instruction at a time. Watch the registers on the right: any register that just changed flashes briefly in cyan. The PC value updates with each step, and you can see exactly which syscall is about to fire by looking at $v0."

---

## Section 3: Examples and console input (about 60 seconds)

**Action 1:** Open the **Examples** dropdown in the toolbar.
**Say:** "We bundle six example programs. Let me load Sum 1 to N, which is the canonical syscall I/O example."

**Action 2:** Click **Sum 1..N**.

**Action 3:** Click **Run**. When the prompt appears in the console, type `5` and press Enter.
**Say:** "When the program calls syscall 5 to read an integer, the console drops in an inline input field. The simulator pauses until you submit. Type a value, press Enter, and the program continues. The result is the sum from 1 to 5, which is 15."

---

## Section 4: Editor errors and debugging (about 90 seconds)

**Action 1:** Click into the editor and add a typo. For example, change `add` to `addd` on any line.
**Say:** "Monaco shows assembler errors inline as red squiggles, with hover messages that explain what went wrong."

**Action 2:** Click the **Problems** tab in the bottom panel.
**Say:** "The Problems panel aggregates every assembler and runtime error. Clicking an entry jumps the editor cursor to the offending line."

**Action 3:** Click the error in Problems to demonstrate the jump. Then fix the typo back to `add` and Assemble again.

**Action 4:** Click in the editor gutter (the area to the left of the line numbers) on any executable line. A red dot appears.
**Say:** "Click in the gutter to set a breakpoint. Breakpoints persist per file in localStorage. The Breakpoints panel in the left rail lists every active breakpoint with a preview of its source line and a click-to-jump action."

**Action 5:** Click **Run** again. The program halts at the breakpoint.

**Action 6:** Click **Backstep** twice.
**Say:** "Backstep is the most interesting debugging feature. The simulator keeps a circular history of register and memory snapshots, so you can rewind recent steps and watch the inspector revert. This is something the original MARS does not do."

---

## Section 5: FPU and the settings dialog (about 60 seconds)

**Action 1:** Open the **Settings** menu and click **Open Settings**, or press `Ctrl+,`.
**Say:** "We support three themes, an editor font slider, and three simulator toggles. The toggles are real-MIPS behaviors that most courses teach in their second half."

**Action 2:** Switch to the **Simulator** tab in the dialog. Check **FPU panel**.
**Say:** "Enabling the FPU panel exposes the coprocessor 1 register file in the right inspector. We support 20 single-precision FPU instructions, the FCSR condition flag, and integer-to-float and float-to-integer conversions."

**Action 3:** Close the dialog. Open the Examples dropdown and click **Float Math (FPU)**.

**Action 4:** Expand the **FPU ($f0..$f31)** section in the right panel. Click **Run**.
**Say:** "This program computes the square root of three squared plus four squared. Watch $f0 through $f6 fill in as the program executes. The final result is 5, which prints in the console."

---

## Section 6: Tools menu (about 90 seconds, v1.1.0)

**Action 1:** Open the **Tools** menu in the menu bar.
**Say:** "WebMARS v1.1 ships a real Tools menu. Six tools are working today, six more are placeholders for v2.0 with descriptions of what they will do."

**Action 2:** Click **Bitmap Display**. In the dialog, set the cell size to 8 and grid to 64. Click **Connect**.
**Say:** "Bitmap Display treats memory as a 2D pixel grid. Each word is one RGB pixel. Run a program that writes color values into the data segment and watch them paint here. This is what students use to write Pong, Snake, and Game of Life."

**Action 3:** Close the Bitmap Display. Open **Tools** → **Floating-Point Representation**.
**Say:** "Type a decimal value, see the 32 bits. Click any bit to flip it. The decoded sign, exponent, and mantissa update live. Useful when teaching IEEE 754."

**Action 4:** Close the dialog. Open **Tools** → **Memory Reference Visualization**.
**Say:** "Open this BEFORE running a program. It tracks every memory access and shows the top 50 addresses as a bar chart. Useful for teaching locality."

**Action 5:** Close the dialog. Press `F1`.
**Say:** "F1 opens the in-app help dialog. Six tabs cover every supported instruction, every pseudo-op, every directive, every syscall, and the runtime exceptions. Filterable. No more flipping between WebMARS and the MARS PDF."

**Action 6:** Close the help dialog.

---

## Section 7: Polish (about 60 seconds)

**Action 1:** Press `Ctrl+Shift+P`.
**Say:** "Command palette. Every action in the application is reachable from here with fuzzy search. Same pattern as VS Code."

**Action 2:** Type `theme` to filter. Click **Theme: Light**.
**Say:** "Three themes ship: dark, light, and high contrast. Choice persists across reloads."

**Action 3:** Switch back to dark via the palette or Settings.

**Action 4:** Drag the strip between the source pane and the bottom panel. Then drag the strip between the center pane and the right inspector.
**Say:** "v1.1 added drag-to-resize between the workspace regions. Sizes persist."

**Action 5:** Resize the browser window narrow, below 768 pixels wide.
**Say:** "Below 768 pixels the shell switches to a mobile layout: hamburger drawer for menus, four tabs for editor and inspector views, and a control bar at the bottom. The editor is read-only by default but the user can opt into editing through the header toggle."

**Action 6:** Restore the browser width.

---

## Section 8: Close (about 30 seconds)

**Say:** "WebMARS v1.1.0 ships every must-have feature in our PRD plus every listed stretch goal, plus a six-tool Tools menu, an in-app help dialog, drag-to-resize panels, and a real mobile shell. The codebase is 119 unit and integration tests, a 405 KB JavaScript bundle, and a strict separation between the simulator core and the React UI so the engine can be tested without mounting any UI. The deployed build is at webmarsimulator.com. The full project writeup is in docs slash FINAL_REPORT.md, and the supported instruction set is in the README. Thanks for watching."

---

## If something goes wrong during the demo

- **Vercel build is unreachable:** fall back to `npm run dev` locally. The dev server starts in under a second on any modern machine.
- **A syscall input freezes the demo:** the Console tab shows a pending input field. If it does not, click **Reset** and try the example again.
- **Assemble produces an unexpected error:** check the Messages tab. Every error includes a line number. If you cannot resolve it live, switch to a different example.
- **The audience asks about pipeline timing, hazards, forwarding, or cache:** these are out of scope for v1.0. Reference section 4 of the final report (What We Cut) for the full list.
- **The audience asks about coprocessor 0 or double-precision FPU:** these are deferred to a future phase. Reference section 5 of the final report (What We Would Do Next).
- **The audience asks about the original MARS:** acknowledge it directly. WebMARS is built as a tribute, not a replacement of the educational model. The acknowledgements section of the README credits Pete Sanderson and Kenneth Vollmar.

---

## Variants by time budget

- **Two minutes:** Sections 1, 2, and 8 only. Skip examples, debugging, FPU, tools, and polish.
- **Five minutes:** Sections 1, 2, 3, 4, and 8. Skip FPU, tools, and polish. This is the strongest cut for a tight time slot.
- **Seven minutes:** Sections 1, 2, 3, 4, 5, 7, 8. Skip the Tools section.
- **Nine minutes:** every section in order, as scripted above.
- **Twelve minutes:** every section, plus enable the delayed-branching toggle and step through a `beq` followed by an `addi` to show the delay slot fire, plus open Tools → Keyboard / Display MMIO and load the MMIO Keyboard Echo example.
