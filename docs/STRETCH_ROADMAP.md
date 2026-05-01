# WebMARS — Stretch Goal Roadmap

This document captures features beyond the v1.0 PRD scope that we
have considered, prioritized, and either committed to as Day 5
stretch work or explicitly deferred to post-v1.0.

The PRD §3.2 stretch list is the authoritative source for v1.0
stretch goals. This document supplements it with concrete
prioritization, implementation notes, and the "what makes WebMARS
better than MARS" thesis.

## Tier 1 — Day 5 stretch (build if Days 2–4 finish on time)

These are cheap, high-impact, and visible in the demo.

### 1.1 Examples dropdown in the control bar

A dropdown between the wordmark and the divider with 5 starter
programs:
- Hello, MIPS! (already pre-loaded as default)
- Sum 1 to N
- Factorial (recursive)
- String length
- Array sum

Each writes its source into the store via `loadExample(name)`. The
store action is already stubbed in SA-6.5 item 1.

Why it matters: turns WebMARS into a teaching tool, not just a
runtime. Real MARS has nothing like this.

Estimated effort: 1 hour.

### 1.2 Inline instruction reference (hover tooltips)

Hover any mnemonic in the editor → tooltip shows:
"ADD — Add (with overflow). `add $rd, $rs, $rt` sets $rd = $rs + $rt."

Implementation note: Monaco's hover provider API. Build a static
JSON map of the ~40 v1.0 mnemonics; the lookup is trivial. The
work is in the JSON map and the hover provider registration.

Why it matters: students learning MIPS can self-serve without
leaving the editor. Real MARS makes you open a separate help
window.

Estimated effort: 2 hours.

### 1.3 Breakpoint clicks in the gutter

Click a line number in the gutter → red dot appears → run() halts
there.

Implementation note: store breakpoints as Set<number> of line
numbers in Zustand. Simulator's run() checks before each step.
Visual: a 6px red circle in the gutter at the breakpoint line.
Click again to remove.

Why it matters: real MARS buries breakpoints in a menu. Click-to-
breakpoint is the standard IDE pattern. This is the single biggest
UX upgrade over real MARS that we can ship.

Estimated effort: 2 hours (depends on simulator step loop being
debuggable, which Zachary plans for Day 4).

### 1.4 Dynamic document title

```
WebMARS                        (idle, default)
● Running — WebMARS            (during execution)
⏸ Paused at line 12 — WebMARS  (at breakpoint)
✕ Error: line 5 — WebMARS      (on error)
```

Implementation: useEffect in App.tsx watching status, set
document.title.

Why it matters: users can see execution state from a background
tab. This is the kind of detail that says "someone cared."

Estimated effort: 15 minutes.

### 1.5 Real favicon

32x32 SVG, dark navy background (--surface-0), 12x12 cyan square
upper-left, "WM" in JetBrains Mono Bold lower-right, white.

Embed inline in index.html as data URI.

Estimated effort: 15 minutes.

## Tier 2 — Day 5 if everything in Tier 1 ships

### 2.1 Number base toggle wired to actual values

The HEX/DEC/BIN segmented control in the registers panel is
scaffold-only today (only HEX is live). Wire DEC and BIN to format
register values in the chosen base.

Estimated effort: 30 minutes (display layer only).

### 2.2 Register-changed persistent indicator

After every step, registers that changed get the existing 600ms
flash. Take it further: keep a thin 2px --accent left-border on
changed registers for 3 seconds, fading out via CSS transition.

Why it matters: lets the user step rapidly and still see which
registers were touched 3 steps ago.

Estimated effort: 30 minutes.

### 2.3 Mobile read-only mode

Below 1024px the inspector already stacks below the editor (SA-3).
Take it 90% there: hide the editor at <768px, show only registers
+ memory + console as a read-only view, with a banner "Open on a
desktop to edit code."

Why it matters: graders will click the live URL on a phone first.
A "site looks broken on mobile" first impression hurts.

Estimated effort: 1 hour.

## Tier 3 — Differentiators (build only if Tier 1 + 2 are done)

These are the features that distinguish WebMARS from a "skin"
on top of MARS.

### 3.1 Animated datapath visualization

When the user clicks Step, briefly show — for ~400ms — a small
diagram below the editor showing which registers and memory cells
the instruction touched. For `add $t0, $t1, $t2`, draw a quick line
from $t1 and $t2 (highlighted) into an ALU box, then to $t0
(flashing destination).

Real MARS has a "MIPS X-Ray" tool that does something like this
but it's hideous and buried in a menu. Yours could be inline,
opt-in via a small toggle, and beautiful.

This is exactly the kind of feature that wins the grade.

Implementation note: SVG, animated via Motion library. We'd need
to add Motion to package.json — confirm with Bryan before adding
the dep.

Estimated effort: 4 hours.

### 3.2 Time-travel debugging scrubber

State snapshots after every step, stored in a circular buffer of
the last 200 steps. Add a scrubber below the control bar: drag
back to see the register state from 50 steps ago.

Real MARS has a single back-step button; we'd have a timeline.

Implementation note: Zustand store with structured-clone snapshots
on every step. 200 snapshots × ~150 bytes each ≈ 30KB memory.
Trivial.

Estimated effort: 3 hours.

### 3.3 Shareable URL hash

Encode the entire app state (source + register state + memory)
into a URL hash. Share a link → load directly into a debugging
session.

Real MARS has no concept of shareable state. It's a desktop app
from 2014.

Implementation note: gzip + base64-encode the state, stuff in
location.hash. Watch hashchange and decode on load.

Estimated effort: 2 hours.

## Tier 4 — Polish & a11y

These are 30-minute items individually that should land
opportunistically across Days 5–6.

- Keyboard shortcuts overlay (`?` opens overlay): Ctrl+Enter =
  Assemble, F5 = Run, F10 = Step, F2 = Reset, Ctrl+1/2/3 =
  inspector tabs.
- aria-label on status pill so SR reads "Simulator status: idle"
  not just "idle."
- High-contrast mode test in Windows.
- Empty-state copy review (every empty state should explain what
  WILL appear, not just "Coming soon").

## Out of v1.0 scope, won't do

For the record, locked in:

- Tools menu (cache simulator, bitmap display, BHT, etc.) — out
  per PRD §1.4.
- Coprocessor 0 (CP0) and Coprocessor 1 (FPU) registers — out per
  PRD §1.4.
- Macros (.macro / .end_macro) — out per PRD §3.3 limitations.
- .float, .double, FP instructions — out per PRD §3.3.
- .include / multi-file projects — out per PRD §3.3.
- Delayed branching toggle — out per PRD §3.3.
- Back-step (undo single instruction) — superseded by 3.2 above
  if we build it; otherwise out.
- Settings dialog — out for v1.0; can add post-v1.0.
- File I/O syscalls (13–17) — out per PRD §10.1 syscall list.
- MIDI / dialog syscalls — out per PRD §10.1.

## Decision rule

A stretch item gets built if and only if:
1. All v1.0 Must-Have features (PRD §3.1) are complete and the
   five golden programs run end-to-end.
2. The feature is Tier 1 in this document, OR
   the feature is Tier 2/3 AND every preceding tier is complete.
3. There is at least 2 hours of buffer remaining before the
   noon-Day-6 stretch hard stop.

If any of those is false, do not start the feature. Polish what
exists.
