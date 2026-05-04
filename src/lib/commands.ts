// Command registry consumed by the command palette and (later) the
// keyboard shortcut layer in SA-14. Each command is a snapshot built
// at palette-open time — actions reach into useSimulator.getState() so
// the run() body always sees the latest store, even if the palette
// has been mounted for a while.
//
// Commands deliberately don't carry React-level state. The palette
// renders them flat; group + label is what the user filters against.

import { useSimulator, type ExampleName } from '@/hooks/useSimulator.ts'

export interface Command {
  id: string
  label: string
  group: 'File' | 'Edit' | 'View' | 'Run' | 'Examples' | 'Settings' | 'Tools' | 'Help'
  shortcut?: string
  run: () => void
  disabled?: boolean
}

const EXAMPLES: ReadonlyArray<{ id: ExampleName; label: string }> = [
  { id: 'arraySum',    label: 'Array Sum'    },
  { id: 'factorial',   label: 'Factorial'    },
  { id: 'stringPrint', label: 'String Print' },
  { id: 'sumToN',      label: 'Sum 1..N'     },
  { id: 'syscallIO',   label: 'Syscall I/O'  },
  { id: 'floatMath',   label: 'Float Math (FPU)' },
  { id: 'mmioEcho',    label: 'MMIO Keyboard Echo' },
  { id: 'bitmapSmile', label: 'Bitmap Smile' },
]

export function buildCommands(): Command[] {
  const s = useSimulator.getState()
  const out: Command[] = []

  // ─ File ─
  out.push(
    { id: 'file.new',      label: 'New File',      group: 'File', shortcut: 'Ctrl+N',       run: s.newFile                                },
    { id: 'file.open',     label: 'Open…',         group: 'File', shortcut: 'Ctrl+O',       run: () => { void s.openFromDisk() }          },
    { id: 'file.save',     label: 'Save',          group: 'File', shortcut: 'Ctrl+S',       run: () => { void s.saveActive() },   disabled: s.activeFileId === null },
    { id: 'file.saveAs',   label: 'Save As…',      group: 'File', shortcut: 'Ctrl+Shift+S', run: () => { void s.saveActiveAs() }, disabled: s.activeFileId === null },
    { id: 'file.saveAll',  label: 'Save All',      group: 'File',                            run: () => { void s.saveAll() },     disabled: !s.files.some((f) => f.modified && f.handle !== null) },
    { id: 'file.close',    label: 'Close File',    group: 'File', shortcut: 'Ctrl+W',       run: () => { if (s.activeFileId !== null) void s.closeFile(s.activeFileId) }, disabled: s.activeFileId === null },
    { id: 'file.closeAll', label: 'Close All',     group: 'File',                            run: () => { void s.closeAll() } },
  )

  // ─ Examples ─
  for (const ex of EXAMPLES) {
    out.push({
      id: `examples.load.${ex.id}`,
      label: `Load Example · ${ex.label}`,
      group: 'Examples',
      run: () => s.loadFromExample(ex.id),
    })
  }

  // ─ View ─
  out.push(
    { id: 'view.toggleLeft',   label: 'Toggle Left Rail',     group: 'View', shortcut: 'Ctrl+B',     run: s.toggleLeftRail    },
    { id: 'view.toggleRight',  label: 'Toggle Right Panel',   group: 'View', shortcut: 'Ctrl+Alt+B', run: s.toggleRightPanel  },
    { id: 'view.toggleBottom', label: 'Toggle Bottom Panel',  group: 'View', shortcut: 'Ctrl+J',     run: s.toggleBottomPanel },
    { id: 'view.symbols',      label: 'Show Symbols Panel',         group: 'View',                  run: () => { s.setLeftPanel('symbols');     if (!s.leftRailExpanded) s.toggleLeftRail() } },
    { id: 'view.breakpoints',  label: 'Show Breakpoints Panel',     group: 'View',                  run: () => { s.setLeftPanel('breakpoints'); if (!s.leftRailExpanded) s.toggleLeftRail() } },
    { id: 'view.reference',    label: 'Show Instruction Reference', group: 'View',                  run: () => { s.setLeftPanel('reference');   if (!s.leftRailExpanded) s.toggleLeftRail() } },
    { id: 'view.console',      label: 'Show Console',         group: 'View', run: () => { s.setBottomTab('console');  if (!s.bottomPanelOpen) s.toggleBottomPanel() } },
    { id: 'view.messages',     label: 'Show Messages',        group: 'View', run: () => { s.setBottomTab('messages'); if (!s.bottomPanelOpen) s.toggleBottomPanel() } },
    { id: 'view.problems',     label: 'Show Problems',        group: 'View', run: () => { s.setBottomTab('problems'); if (!s.bottomPanelOpen) s.toggleBottomPanel() } },
    { id: 'view.numberHex',    label: 'Number Base · Hex',    group: 'View', run: () => s.setNumberBase('hex') },
    { id: 'view.numberDec',    label: 'Number Base · Dec',    group: 'View', run: () => s.setNumberBase('dec') },
    { id: 'view.numberBin',    label: 'Number Base · Bin',    group: 'View', run: () => s.setNumberBase('bin') },
  )

  // ─ Run ─
  const runnable = s.source.length > 0
  const canPause = s.status === 'running'
  const canStep  = s.status === 'ready' || s.status === 'paused'
  out.push(
    { id: 'run.assemble',     label: 'Assemble',          group: 'Run', shortcut: 'F3',       run: s.assemble,    disabled: !runnable },
    { id: 'run.run',          label: 'Run',               group: 'Run', shortcut: 'F5',       run: s.run,         disabled: !runnable },
    { id: 'run.pause',        label: 'Pause',             group: 'Run', shortcut: 'F6',       run: s.pause,       disabled: !canPause },
    { id: 'run.step',         label: 'Step',              group: 'Run', shortcut: 'F7',       run: s.step,        disabled: !canStep  },
    { id: 'run.backstep',     label: 'Backstep',          group: 'Run', shortcut: 'Shift+F7', run: s.backstep,    disabled: !s.canBackstep() },
    { id: 'run.reset',        label: 'Reset',             group: 'Run', shortcut: 'Ctrl+R',   run: s.reset,       disabled: !runnable },
  )

  // ─ Settings ─
  out.push(
    { id: 'settings.open',       label: 'Open Settings…',         group: 'Settings', shortcut: 'Ctrl+,', run: s.openSettings },
    { id: 'settings.themeDark',  label: 'Theme · Dark',           group: 'Settings', run: () => s.setTheme('dark')  },
    { id: 'settings.themeLight', label: 'Theme · Light',          group: 'Settings', run: () => s.setTheme('light') },
    { id: 'settings.themeHC',    label: 'Theme · High Contrast',  group: 'Settings', run: () => s.setTheme('hc')    },
  )

  // ─ Tools ─
  out.push(
    { id: 'tools.instructionCounter', label: 'Instruction Counter', group: 'Tools', run: () => s.openTool('instructionCounter') },
  )

  return out
}

// Subsequence fuzzy match: every char of `q` (lowercased) must appear
// in `text` (lowercased) in order. Returns a score (lower = better)
// or null if no match. Score = total gap between matched chars + the
// position of the first match (so prefix matches sort above tail
// matches). Fast enough for ~50 commands without memoization.
export function fuzzyMatch(text: string, q: string): number | null {
  if (q.length === 0) return 0
  const t = text.toLowerCase()
  const query = q.toLowerCase()
  let score = 0
  let lastIdx = -1
  for (let i = 0; i < query.length; i++) {
    const ch = query[i]
    if (ch === undefined) continue
    const idx = t.indexOf(ch, lastIdx + 1)
    if (idx === -1) return null
    if (lastIdx !== -1) score += idx - lastIdx - 1
    if (i === 0) score += idx
    lastIdx = idx
  }
  return score
}
