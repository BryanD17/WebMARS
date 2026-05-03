import { create } from 'zustand'
import { Simulator } from '../core/simulator.ts'
import { assemble } from '../core/instructions.ts'
import { REGISTER_NAMES } from '../core/registers.ts'
import type { AssembledProgram } from '../core/types.ts'
import type {
  AssemblerError,
  InspectorTab,
  RegisterSnapshot,
  RuntimeError,
  SimStatus,
} from './types.ts'
import {
  openFile as openFileFromDisk,
  saveFile as writeFileToDisk,
  saveFileAs as writeFileToDiskAs,
} from '../lib/fileIO.ts'

// Bundled example programs — loaded as raw strings via Vite's ?raw
// import. The 5 .asm files in src/examples/ become buttons in the
// Examples dropdown (SA-2 commit 4).
import arraySumSource    from '../examples/arraySum.asm?raw'
import factorialSource   from '../examples/factorial.asm?raw'
import stringPrintSource from '../examples/stringPrint.asm?raw'
import sumToNSource      from '../examples/sumToN.asm?raw'
import syscallIOSource   from '../examples/syscallIO.asm?raw'

// Canonical MIPS / real-MARS conventions: program text starts at
// 0x00400000 and the stack pointer initializes at 0x7FFFEFFC (top of
// the user stack segment, just below the kernel-reserved region). The
// engine's createRegisterFile() in src/core/registers.ts uses the same
// value, so the pre-Assemble register table and the post-Assemble
// snapshot agree on $sp without a visible value jump.
const MIPS_TEXT_BASE = 0x00400000
const MIPS_STACK_TOP = 0x7fffeffc

const HELLO_MIPS_SOURCE = `# Welcome to WebMARS.
# This is a working example. Click Assemble, then Run.

.data
msg:    .asciiz "Hello, MIPS!\\n"

.text
main:   li      $v0, 4          # syscall 4 = print string
        la      $a0, msg
        syscall

        li      $v0, 10         # syscall 10 = exit
        syscall
`

const EXAMPLES: Record<string, string> = {
  hello: HELLO_MIPS_SOURCE,
}

function buildInitialGpr(): Record<string, number> {
  const gpr: Record<string, number> = {}
  for (const name of REGISTER_NAMES) {
    gpr[name] = 0
  }
  gpr['$sp'] = MIPS_STACK_TOP
  return gpr
}

const initialRegisters: RegisterSnapshot = {
  pc: MIPS_TEXT_BASE,
  hi: 0,
  lo: 0,
  gpr: buildInitialGpr(),
  changed: new Set<string>(),
}

// Translate the engine's numeric-index lastChangedRegisters + prev/next
// pc/hi/lo into the contract's named Set<string>.
function buildChangedSet(
  engineState: { registers: number[]; hi: number; lo: number; pc: number; lastChangedRegisters: Set<number> },
  prev: RegisterSnapshot,
): Set<string> {
  const changed = new Set<string>()
  for (const idx of engineState.lastChangedRegisters) {
    const name = REGISTER_NAMES[idx]
    if (name !== undefined) changed.add(name)
  }
  if (engineState.pc !== prev.pc) changed.add('pc')
  if (engineState.hi !== prev.hi) changed.add('hi')
  if (engineState.lo !== prev.lo) changed.add('lo')
  return changed
}

function buildSnapshot(
  engineState: { registers: number[]; hi: number; lo: number; pc: number; lastChangedRegisters: Set<number> },
  prev: RegisterSnapshot,
): RegisterSnapshot {
  const gpr: Record<string, number> = {}
  for (let i = 0; i < REGISTER_NAMES.length; i++) {
    const name = REGISTER_NAMES[i]
    if (name !== undefined) gpr[name] = engineState.registers[i] ?? 0
  }
  return {
    pc: engineState.pc,
    hi: engineState.hi,
    lo: engineState.lo,
    gpr,
    changed: buildChangedSet(engineState, prev),
  }
}

// Engine-level AssemblerError → contract AssemblerError (same shape, different source)
function toContractErrors(errs: { line: number; message: string }[]): AssemblerError[] {
  return errs.map((e) => ({ line: e.line, message: e.message }))
}

// ─ layout slice (additive — frozen contract preserved) ─

export type LeftPanelKey =
  | 'project' | 'symbols' | 'breakpoints' | 'reference' | 'syscalls' | 'recent' | 'tools'

export type BottomPanelTab = 'console' | 'messages' | 'problems'

export type NumberBase = 'hex' | 'dec' | 'bin'

interface PersistedLayout {
  leftRailExpanded: boolean
  leftPanelKey: LeftPanelKey
  bottomPanelOpen: boolean
  bottomPanelTab: BottomPanelTab
  rightPanelOpen: boolean
}

const LAYOUT_STORAGE_KEY = 'webmars:layout'
const LEFT_PANEL_KEYS: ReadonlyArray<LeftPanelKey> = [
  'project', 'symbols', 'breakpoints', 'reference', 'syscalls', 'recent', 'tools',
]
const BOTTOM_PANEL_TABS: ReadonlyArray<BottomPanelTab> = ['console', 'messages', 'problems']

const NUMBER_BASE_STORAGE_KEY = 'webmars:number-base'
const NUMBER_BASES: ReadonlyArray<NumberBase> = ['hex', 'dec', 'bin']

function readPersistedNumberBase(): NumberBase {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(NUMBER_BASE_STORAGE_KEY)
    if (raw && (NUMBER_BASES as ReadonlyArray<string>).includes(raw)) {
      return raw as NumberBase
    }
  } catch {
    // ignore
  }
  return 'hex'
}

function writePersistedNumberBase(base: NumberBase): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(NUMBER_BASE_STORAGE_KEY, base)
  } catch {
    // ignore
  }
}

function readPersistedLayout(): Partial<PersistedLayout> {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: Partial<PersistedLayout> = {}
    const obj = parsed as Record<string, unknown>
    if (typeof obj.leftRailExpanded === 'boolean') out.leftRailExpanded = obj.leftRailExpanded
    if (typeof obj.bottomPanelOpen === 'boolean')  out.bottomPanelOpen  = obj.bottomPanelOpen
    if (typeof obj.rightPanelOpen === 'boolean')   out.rightPanelOpen   = obj.rightPanelOpen
    if (typeof obj.leftPanelKey === 'string' && (LEFT_PANEL_KEYS as ReadonlyArray<string>).includes(obj.leftPanelKey)) {
      out.leftPanelKey = obj.leftPanelKey as LeftPanelKey
    }
    if (typeof obj.bottomPanelTab === 'string' && (BOTTOM_PANEL_TABS as ReadonlyArray<string>).includes(obj.bottomPanelTab)) {
      out.bottomPanelTab = obj.bottomPanelTab as BottomPanelTab
    }
    return out
  } catch {
    return {}
  }
}

function writePersistedLayout(layout: PersistedLayout): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // localStorage can throw under privacy mode / quota — silent fall-through is fine
  }
}

function computeInitialLayout(): PersistedLayout {
  const persisted = readPersistedLayout()
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth
  return {
    leftRailExpanded: persisted.leftRailExpanded ?? width >= 1280,
    leftPanelKey:    persisted.leftPanelKey    ?? 'project',
    bottomPanelOpen: persisted.bottomPanelOpen ?? width >= 768,
    bottomPanelTab:  persisted.bottomPanelTab  ?? 'console',
    rightPanelOpen:  persisted.rightPanelOpen  ?? width >= 1024,
  }
}

// ─ file slice (additive — frozen contract preserved) ─
//
// `source` stays in the contract as the canonical content of the
// active file. setSource mirrors writes into the active file's entry
// in `files` and flips its modified flag. setActiveFile copies the
// new file's source into the contract field so the editor / assembler
// keep reading from one place.

export type ExampleName =
  | 'arraySum' | 'factorial' | 'stringPrint' | 'sumToN' | 'syscallIO'

export interface FileEntry {
  id: string
  name: string
  source: string
  handle: FileSystemFileHandle | null
  modified: boolean
}

export interface RecentFile {
  name: string
  lastOpened: string   // ISO 8601
}

const EXAMPLE_SOURCES: Record<ExampleName, string> = {
  arraySum:    arraySumSource,
  factorial:   factorialSource,
  stringPrint: stringPrintSource,
  sumToN:      sumToNSource,
  syscallIO:   syscallIOSource,
}

const RECENT_FILES_KEY = 'webmars:recent-files'
const MAX_RECENT_FILES = 10

function readRecentFiles(): RecentFile[] {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(RECENT_FILES_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: RecentFile[] = []
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue
      const obj = entry as Record<string, unknown>
      if (typeof obj.name === 'string' && typeof obj.lastOpened === 'string') {
        out.push({ name: obj.name, lastOpened: obj.lastOpened })
      }
    }
    return out.slice(0, MAX_RECENT_FILES)
  } catch {
    return []
  }
}

function writeRecentFiles(list: RecentFile[]): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(list))
  } catch {
    // ignore — privacy mode / quota
  }
}

function pushRecentFile(name: string, list: RecentFile[]): RecentFile[] {
  const filtered = list.filter((r) => r.name !== name)
  const next: RecentFile = { name, lastOpened: new Date().toISOString() }
  return [next, ...filtered].slice(0, MAX_RECENT_FILES)
}

function makeFileId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

// ─ bottom-panel messages ─

export type BottomMessageLevel = 'info' | 'warn' | 'error'

export interface BottomMessage {
  id: string
  ts: number             // Date.now()
  level: BottomMessageLevel
  text: string
  line?: number          // optional source line for click-to-jump
}

// ─ memory inspector ─

export type MemoryViewSegment = 'text' | 'data' | 'stack'

// Default base addresses per segment — match Zach's engine constants
// in src/core/memory.ts (TEXT_BASE / DATA_BASE / STACK_BASE).
export const SEGMENT_BASES: Record<MemoryViewSegment, number> = {
  text:  0x00400000,
  data:  0x10010000,
  // Stack grows down from here — show the 32 words BELOW STACK_BASE
  // so the most recent pushes are visible at the top.
  stack: 0x7fffefe0,
}

const MEMORY_WINDOW_WORDS = 64   // 8 rows × 8 words per row

const MEMORY_VIEW_STORAGE_KEY = 'webmars:memory-view'
const MEMORY_VIEW_SEGMENTS: ReadonlyArray<MemoryViewSegment> = ['text', 'data', 'stack']

interface PersistedMemoryView {
  segment: MemoryViewSegment
  base: number
}

function readPersistedMemoryView(): PersistedMemoryView {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(MEMORY_VIEW_STORAGE_KEY)
    if (raw === null) return { segment: 'data', base: SEGMENT_BASES.data }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return { segment: 'data', base: SEGMENT_BASES.data }
    }
    const obj = parsed as Record<string, unknown>
    const segment: MemoryViewSegment =
      typeof obj.segment === 'string' && (MEMORY_VIEW_SEGMENTS as ReadonlyArray<string>).includes(obj.segment)
        ? (obj.segment as MemoryViewSegment)
        : 'data'
    const base: number =
      typeof obj.base === 'number' && Number.isFinite(obj.base)
        ? obj.base >>> 0
        : SEGMENT_BASES[segment]
    return { segment, base }
  } catch {
    return { segment: 'data', base: SEGMENT_BASES.data }
  }
}

function writePersistedMemoryView(view: PersistedMemoryView): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MEMORY_VIEW_STORAGE_KEY, JSON.stringify(view))
  } catch {
    // ignore
  }
}

// ─ runtime controls ─

const RUN_SPEED_STORAGE_KEY = 'webmars:run-speed'
// Discrete throttle stops, surfaced by the toolbar slider. 0 = ∞
// (unlimited).
export const RUN_SPEED_STOPS: ReadonlyArray<number> = [1, 5, 10, 30, 60, 100, 500, 0]

function readPersistedRunSpeed(): number {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(RUN_SPEED_STORAGE_KEY)
    if (raw === null) return 0
    const n = Number(raw)
    if (Number.isFinite(n) && (RUN_SPEED_STOPS as ReadonlyArray<number>).includes(n)) return n
    return 0
  } catch { return 0 }
}

function writePersistedRunSpeed(speed: number): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(RUN_SPEED_STORAGE_KEY, String(speed))
  } catch { /* ignore */ }
}

// ─ breakpoints (per-file) ─

const BREAKPOINTS_STORAGE_PREFIX = 'webmars:breakpoints:'

function readPersistedBreakpoints(filename: string): Set<number> {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(BREAKPOINTS_STORAGE_PREFIX + filename)
    if (raw === null) return new Set()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    const out = new Set<number>()
    for (const v of parsed) {
      if (typeof v === 'number' && Number.isInteger(v) && v > 0) out.add(v)
    }
    return out
  } catch {
    return new Set()
  }
}

function writePersistedBreakpoints(filename: string, lines: ReadonlySet<number>): void {
  try {
    if (typeof window === 'undefined') return
    if (lines.size === 0) {
      window.localStorage.removeItem(BREAKPOINTS_STORAGE_PREFIX + filename)
    } else {
      window.localStorage.setItem(BREAKPOINTS_STORAGE_PREFIX + filename, JSON.stringify([...lines]))
    }
  } catch {
    // ignore
  }
}

// ─ console input ─

export type PendingInputKind = 'int' | 'string' | 'char'

export interface PendingInput {
  kind: PendingInputKind
  maxLen?: number                       // for readString (syscall 8)
  // resolve is called with the raw user input; resolveError triggers
  // a re-prompt without resolving the underlying Promise (used for
  // invalid integer input — the program is still waiting).
  resolve: (raw: string) => void
}

const MAX_MESSAGES = 200

function makeMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

interface SimulatorStoreState {
  // ─ contract fields (must match src/hooks/types.ts) ─
  source: string
  status: SimStatus
  registers: RegisterSnapshot
  consoleOutput: string[]
  assemblerErrors: AssemblerError[]
  runtimeError: RuntimeError | null
  inspectorTab: InspectorTab

  // ─ contract actions ─
  setSource: (next: string) => void
  setInspectorTab: (tab: InspectorTab) => void
  loadExample: (name: string) => void
  assemble: () => void
  run: () => void
  step: () => void
  reset: () => void

  // ─ extensions (engine-specific, not required by contract) ─
  stop: () => void
  program: AssembledProgram | null

  // ─ layout slice (additive; persisted to webmars:layout) ─
  leftRailExpanded: boolean
  leftPanelKey: LeftPanelKey
  bottomPanelOpen: boolean
  bottomPanelTab: BottomPanelTab
  rightPanelOpen: boolean

  toggleLeftRail: () => void
  setLeftPanel: (key: LeftPanelKey) => void
  toggleBottomPanel: () => void
  setBottomTab: (tab: BottomPanelTab) => void
  toggleRightPanel: () => void

  // ─ view slice (additive; persisted to webmars:number-base) ─
  numberBase: NumberBase
  setNumberBase: (base: NumberBase) => void

  // ─ bottom-panel slice (additive; not persisted — session state) ─
  messages: BottomMessage[]
  consoleFilter: string
  logMessage: (level: BottomMessageLevel, text: string, line?: number) => void
  clearMessages: () => void
  clearConsole: () => void
  setConsoleFilter: (next: string) => void

  // ─ console input slice (additive; not persisted — session state) ─
  pendingInput: PendingInput | null
  submitInput: (raw: string) => void

  // ─ memory inspector slice (additive; segment + base persisted) ─
  memoryViewSegment: MemoryViewSegment
  memoryViewBase: number
  memoryWords: ReadonlyArray<{ addr: number; word: number }>
  memoryChanged: ReadonlySet<number>
  setMemoryViewSegment: (segment: MemoryViewSegment) => void
  setMemoryViewBase: (addr: number) => void
  refreshMemorySnapshot: () => void
  writeMemoryWord: (addr: number, value: number) => boolean

  // ─ file slice (additive; recents persisted to webmars:recent-files) ─
  files: FileEntry[]
  activeFileId: string | null
  recentFiles: RecentFile[]

  newFile: () => void
  openFromDisk: () => Promise<void>
  saveActive: () => Promise<void>
  saveActiveAs: () => Promise<void>
  saveAll: () => Promise<void>
  closeFile: (id: string) => Promise<void>
  closeAll: () => Promise<void>
  setActiveFile: (id: string) => void
  reorderFiles: (fromIndex: number, toIndex: number) => void
  loadFromExample: (name: ExampleName) => void

  // ─ breakpoints slice (additive; persisted per-file) ─
  breakpoints: ReadonlySet<number>     // line numbers, ACTIVE file's set
  toggleBreakpoint: (line: number) => void
  clearAllBreakpoints: () => void

  // ─ runtime controls slice (additive; runSpeed persisted) ─
  runSpeed: number                     // 0 = unlimited; otherwise instructions/sec
  setRunSpeed: (next: number) => void
  pause: () => void
  runToCursor: (line: number) => void
  backstep: () => void
  canBackstep: () => boolean
}

let _sim: Simulator | null = null
let _stopFlag = false

export const useSimulator = create<SimulatorStoreState>((set, get) => {
  function makeSim(): Simulator {
    if (_sim) return _sim
    _sim = new Simulator({
      print: (s) => {
        set((state) => ({ consoleOutput: [...state.consoleOutput, s] }))
      },
      // syscall 5 — readInt. Suspends the simulator behind a Promise
      // that the UI's submitInput action resolves with a parsed int.
      // Invalid input re-prompts (PendingInput stays set; the
      // submitInput handler doesn't resolve until parse succeeds).
      readInt: () =>
        new Promise<number>((resolve) => {
          set({
            status: 'paused',
            pendingInput: {
              kind: 'int',
              resolve: (raw) => {
                const n = parseInt(raw.trim(), 10)
                if (Number.isNaN(n)) {
                  // Don't clear pendingInput — the input field will
                  // re-prompt with a validation hint via the UI.
                  return
                }
                set({ pendingInput: null, status: 'running' })
                resolve(n)
              },
            },
          })
          get().logMessage('info', 'Awaiting input: integer (syscall 5)')
        }),

      // syscall 8 — readString. The engine passes maxLen via the
      // SyscallIO contract; UI truncates to that length on submit.
      readString: (maxLen?: number) =>
        new Promise<string>((resolve) => {
          const pending: PendingInput = {
            kind: 'string',
            resolve: (raw) => {
              set({ pendingInput: null, status: 'running' })
              resolve(raw)
            },
            ...(typeof maxLen === 'number' ? { maxLen } : {}),
          }
          set({ status: 'paused', pendingInput: pending })
          get().logMessage('info', 'Awaiting input: string (syscall 8)')
        }),

      exit: () => {
        _stopFlag = true
      },
    })
    return _sim
  }

  const initialLayout = computeInitialLayout()

  function persistLayout(): void {
    const s = get()
    writePersistedLayout({
      leftRailExpanded: s.leftRailExpanded,
      leftPanelKey:     s.leftPanelKey,
      bottomPanelOpen:  s.bottomPanelOpen,
      bottomPanelTab:   s.bottomPanelTab,
      rightPanelOpen:   s.rightPanelOpen,
    })
  }

  // Hello MIPS becomes the initial file entry so screenshots show
  // working code without anyone having to load it.
  const helloFileId = 'hello-mips'
  const initialFiles: FileEntry[] = [
    {
      id: helloFileId,
      name: 'hello.asm',
      source: HELLO_MIPS_SOURCE,
      handle: null,
      modified: false,
    },
  ]

  return {
    source: HELLO_MIPS_SOURCE,
    status: 'idle',
    registers: initialRegisters,
    consoleOutput: [],
    assemblerErrors: [],
    runtimeError: null,
    inspectorTab: 'registers',
    program: null,

    // file slice
    files: initialFiles,
    activeFileId: helloFileId,
    recentFiles: readRecentFiles(),

    // layout slice — initial values from localStorage (or viewport defaults)
    leftRailExpanded: initialLayout.leftRailExpanded,
    leftPanelKey:     initialLayout.leftPanelKey,
    bottomPanelOpen:  initialLayout.bottomPanelOpen,
    bottomPanelTab:   initialLayout.bottomPanelTab,
    rightPanelOpen:   initialLayout.rightPanelOpen,

    toggleLeftRail: () => {
      set((s) => ({ leftRailExpanded: !s.leftRailExpanded }))
      persistLayout()
    },
    setLeftPanel: (key) => {
      set({ leftPanelKey: key })
      persistLayout()
    },
    toggleBottomPanel: () => {
      set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen }))
      persistLayout()
    },
    setBottomTab: (tab) => {
      set({ bottomPanelTab: tab })
      persistLayout()
    },
    toggleRightPanel: () => {
      set((s) => ({ rightPanelOpen: !s.rightPanelOpen }))
      persistLayout()
    },

    // view slice
    numberBase: readPersistedNumberBase(),

    setNumberBase: (base) => {
      set({ numberBase: base })
      writePersistedNumberBase(base)
    },

    // bottom-panel slice
    messages: [],
    consoleFilter: '',

    logMessage: (level, text, line) => {
      const entry: BottomMessage = {
        id: makeMessageId(),
        ts: Date.now(),
        level,
        text,
        ...(line !== undefined ? { line } : {}),
      }
      set((s) => ({
        // Ring buffer: keep the most-recent MAX_MESSAGES (newer at end).
        messages:
          s.messages.length >= MAX_MESSAGES
            ? [...s.messages.slice(s.messages.length - MAX_MESSAGES + 1), entry]
            : [...s.messages, entry],
      }))
    },

    clearMessages: () => set({ messages: [] }),

    clearConsole: () => set({ consoleOutput: [] }),

    setConsoleFilter: (next) => set({ consoleFilter: next }),

    // console input slice
    pendingInput: null,

    submitInput: (raw) => {
      const pending = get().pendingInput
      if (!pending) return
      // For string inputs respect maxLen if set.
      if (pending.kind === 'string' && typeof pending.maxLen === 'number') {
        pending.resolve(raw.slice(0, pending.maxLen))
        return
      }
      pending.resolve(raw)
    },

    // memory inspector slice
    memoryViewSegment: readPersistedMemoryView().segment,
    memoryViewBase:    readPersistedMemoryView().base,
    memoryWords:       [],
    memoryChanged:     new Set<number>(),

    setMemoryViewSegment: (segment) => {
      const base = SEGMENT_BASES[segment]
      set({ memoryViewSegment: segment, memoryViewBase: base, memoryChanged: new Set<number>() })
      writePersistedMemoryView({ segment, base })
      get().refreshMemorySnapshot()
    },

    setMemoryViewBase: (addr) => {
      // Word-align: round down to nearest 4 bytes.
      const aligned = (addr & ~0x3) >>> 0
      set({ memoryViewBase: aligned })
      writePersistedMemoryView({ segment: get().memoryViewSegment, base: aligned })
      get().refreshMemorySnapshot()
    },

    refreshMemorySnapshot: () => {
      if (!_sim) {
        // No active simulator — clear the snapshot so the panel
        // shows empty rows rather than stale data from a prior
        // assemble.
        set({ memoryWords: [], memoryChanged: new Set<number>() })
        return
      }
      const base = get().memoryViewBase
      const next = _sim.memoryDump(base, MEMORY_WINDOW_WORDS)
      const prev = get().memoryWords
      const prevByAddr = new Map<number, number>()
      for (const entry of prev) prevByAddr.set(entry.addr, entry.word)
      const changed = new Set<number>()
      for (const entry of next) {
        const old = prevByAddr.get(entry.addr)
        if (old !== undefined && old !== entry.word) {
          changed.add(entry.addr)
        }
      }
      set({ memoryWords: next, memoryChanged: changed })
    },

    // breakpoints slice — operates on the ACTIVE file's set,
    // persisted per filename in localStorage.
    breakpoints: new Set<number>(),

    toggleBreakpoint: (line) => {
      const s = get()
      const next = new Set(s.breakpoints)
      if (next.has(line)) next.delete(line)
      else next.add(line)
      const active = s.files.find((f) => f.id === s.activeFileId)
      if (active) writePersistedBreakpoints(active.name, next)
      set({ breakpoints: next })
    },

    clearAllBreakpoints: () => {
      const s = get()
      const active = s.files.find((f) => f.id === s.activeFileId)
      if (active) writePersistedBreakpoints(active.name, new Set())
      set({ breakpoints: new Set<number>() })
    },

    // runtime controls slice
    runSpeed: readPersistedRunSpeed(),

    setRunSpeed: (next) => {
      set({ runSpeed: next })
      writePersistedRunSpeed(next)
    },

    pause: () => {
      // Setting _stopFlag breaks the run loop on its next iteration;
      // the loop's finally-block sets status='paused' and refreshes
      // snapshots.
      _stopFlag = true
    },

    runToCursor: (line) => {
      // Implemented in commit 2.
      void line
    },

    backstep: () => {
      // Implemented in commit 3.
    },

    canBackstep: () => {
      // Implemented in commit 3.
      return false
    },

    writeMemoryWord: (addr, value) => {
      if (!_sim) return false
      const aligned = (addr & ~0x3) >>> 0
      try {
        _sim.memoryDump(aligned, 1)   // throws if address is unmapped
      } catch {
        return false
      }
      // Memory is mutated in place via the engine instance —
      // refreshMemorySnapshot picks up the new value.
      try {
        const memory = (_sim as unknown as { memory: { writeWord: (a: number, v: number) => void } }).memory
        memory.writeWord(aligned, value | 0)
      } catch {
        return false
      }
      get().refreshMemorySnapshot()
      return true
    },

    setSource: (next) => set((s) => ({
      source: next,
      files: s.files.map((f) =>
        f.id === s.activeFileId
          ? { ...f, source: next, modified: f.source !== next || f.modified }
          : f,
      ),
    })),

    setInspectorTab: (tab) => set({ inspectorTab: tab }),

    loadExample: (name) => {
      const next = EXAMPLES[name]
      if (next === undefined) {
        console.warn(`[loadExample] no example registered for "${name}"`)
        return
      }
      set({ source: next })
    },

    // ─ file slice actions ─

    newFile: () => {
      const untitledCount = get().files.filter((f) => f.name.startsWith('untitled-')).length
      const id = makeFileId()
      const entry: FileEntry = {
        id,
        name: `untitled-${untitledCount + 1}.asm`,
        source: '',
        handle: null,
        modified: false,
      }
      set((s) => ({
        files: [...s.files, entry],
        activeFileId: id,
        source: '',
      }))
    },

    openFromDisk: async () => {
      const opened = await openFileFromDisk()
      if (!opened) return
      const id = makeFileId()
      const entry: FileEntry = {
        id,
        name: opened.name,
        source: opened.source,
        handle: opened.handle,
        modified: false,
      }
      const nextRecent = pushRecentFile(opened.name, get().recentFiles)
      writeRecentFiles(nextRecent)
      set((s) => ({
        files: [...s.files, entry],
        activeFileId: id,
        source: opened.source,
        recentFiles: nextRecent,
      }))
    },

    saveActive: async () => {
      const s = get()
      const active = s.files.find((f) => f.id === s.activeFileId)
      if (!active) return
      // No handle (fallback browser, or never saved): route through save-as.
      if (!active.handle) {
        await s.saveActiveAs()
        return
      }
      await writeFileToDisk({
        name: active.name,
        source: active.source,
        handle: active.handle,
      })
      const nextRecent = pushRecentFile(active.name, s.recentFiles)
      writeRecentFiles(nextRecent)
      set((curr) => ({
        files: curr.files.map((f) =>
          f.id === active.id ? { ...f, modified: false } : f,
        ),
        recentFiles: nextRecent,
      }))
    },

    saveActiveAs: async () => {
      const s = get()
      const active = s.files.find((f) => f.id === s.activeFileId)
      if (!active) return
      const saved = await writeFileToDiskAs(active.source, active.name)
      if (!saved) return
      const nextRecent = pushRecentFile(saved.name, s.recentFiles)
      writeRecentFiles(nextRecent)
      set((curr) => ({
        files: curr.files.map((f) =>
          f.id === active.id
            ? { ...f, name: saved.name, handle: saved.handle, modified: false }
            : f,
        ),
        recentFiles: nextRecent,
      }))
    },

    saveAll: async () => {
      // Only saves files that are modified AND have a handle. Files
      // without a handle would each prompt for a destination — that's
      // an "save each manually" flow, not a Save All.
      const candidates = get().files.filter((f) => f.modified && f.handle)
      if (candidates.length === 0) return
      for (const f of candidates) {
        await writeFileToDisk({ name: f.name, source: f.source, handle: f.handle })
      }
      const savedIds = new Set(candidates.map((f) => f.id))
      set((curr) => ({
        files: curr.files.map((f) =>
          savedIds.has(f.id) ? { ...f, modified: false } : f,
        ),
      }))
    },

    closeFile: async (id) => {
      const s = get()
      const target = s.files.find((f) => f.id === id)
      if (!target) return
      if (target.modified) {
        // SA-7 will replace this with a proper dialog; the native
        // confirm is fine for SA-2 since the unsaved-close path is
        // rare and Bryan's review already accepted it.
        const ok =
          typeof window !== 'undefined' &&
          window.confirm(`Discard unsaved changes to ${target.name}?`)
        if (!ok) return
      }

      const remaining = s.files.filter((f) => f.id !== id)

      // If we're closing the active file, fall back to the next file
      // (or null if we just closed the last one).
      if (s.activeFileId !== id) {
        set({ files: remaining })
        return
      }
      if (remaining.length === 0) {
        set({ files: [], activeFileId: null, source: '' })
        return
      }
      const next = remaining[0]
      if (!next) {
        set({ files: remaining, activeFileId: null, source: '' })
        return
      }
      set({ files: remaining, activeFileId: next.id, source: next.source })
    },

    closeAll: async () => {
      const ids = get().files.map((f) => f.id)
      for (const id of ids) {
        await get().closeFile(id)
      }
    },

    setActiveFile: (id) => {
      const s = get()
      const target = s.files.find((f) => f.id === id)
      if (!target) return
      set({
        activeFileId: id,
        source: target.source,
        // Switch to the new file's breakpoint set.
        breakpoints: readPersistedBreakpoints(target.name),
      })
    },

    reorderFiles: (fromIndex, toIndex) => {
      set((s) => {
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= s.files.length ||
          toIndex >= s.files.length
        ) {
          return s
        }
        const next = s.files.slice()
        const [moved] = next.splice(fromIndex, 1)
        if (!moved) return s
        next.splice(toIndex, 0, moved)
        return { files: next }
      })
    },

    loadFromExample: (name) => {
      const exampleSrc = EXAMPLE_SOURCES[name]
      const fileName = `${name}.asm`
      const s = get()

      // If the example is already open as a tab, switch + reset its
      // contents (the user expects "Load Example" to be idempotent).
      const existing = s.files.find((f) => f.name === fileName)
      if (existing) {
        set({
          files: s.files.map((f) =>
            f.id === existing.id
              ? { ...f, source: exampleSrc, modified: false }
              : f,
          ),
          activeFileId: existing.id,
          source: exampleSrc,
        })
        return
      }

      const id = makeFileId()
      const entry: FileEntry = {
        id,
        name: fileName,
        source: exampleSrc,
        handle: null,
        modified: false,
      }
      set({
        files: [...s.files, entry],
        activeFileId: id,
        source: exampleSrc,
      })
    },

    assemble: () => {
      const source = get().source
      const program = assemble(source)
      if (program.errors.length > 0) {
        const errs = toContractErrors(program.errors)
        set({
          status: 'error',
          assemblerErrors: errs,
          runtimeError: null,
        })
        // Log a summary; one detailed entry per error so each shows
        // up in Messages with click-to-jump.
        get().logMessage('error', `Assemble failed: ${errs.length} error${errs.length === 1 ? '' : 's'}.`)
        for (const e of errs) {
          get().logMessage('error', `Line ${e.line}: ${e.message}`, e.line)
        }
        return
      }
      _sim = null
      _stopFlag = false
      const sim = makeSim()
      sim.load(program)
      const engineState = sim.getState()
      set({
        status: 'ready',
        program,
        registers: buildSnapshot(engineState, initialRegisters),
        consoleOutput: [],
        assemblerErrors: [],
        runtimeError: null,
      })
      get().logMessage('info', `Assembled successfully: ${program.instructions.length} instructions.`)
      get().refreshMemorySnapshot()
    },

    step: () => {
      const { status, registers: prevRegisters } = get()
      if (status !== 'ready' && status !== 'paused') return
      const sim = makeSim()
      void (async () => {
        try {
          set({ status: 'running' })
          await sim.step()
          const engineState = sim.getState()
          set({
            status: sim.isHalted() ? 'halted' : 'paused',
            registers: buildSnapshot(engineState, prevRegisters),
          })
          get().refreshMemorySnapshot()
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e)
          set({
            status: 'error',
            runtimeError: { pc: get().registers.pc, message },
          })
        }
      })()
    },

    run: () => {
      const { status } = get()
      if (status !== 'ready' && status !== 'paused') return
      const sim = makeSim()
      _stopFlag = false
      set({ status: 'running' })
      void (async () => {
        try {
          let hitBreakpoint = false
          for (let i = 0; i < 1_000_000 && !sim.isHalted() && !_stopFlag; i++) {
            // Breakpoint check: the line ABOUT to execute. If the
            // user just clicked Run from a breakpoint, the first
            // iteration steps past it (otherwise we'd be stuck);
            // subsequent matches halt.
            const breakpoints = get().breakpoints
            if (breakpoints.size > 0 && i > 0) {
              const currentLine = sim.getCurrentLine()
              if (currentLine !== null && breakpoints.has(currentLine)) {
                hitBreakpoint = true
                get().logMessage('info', `Halted at breakpoint on line ${currentLine}.`, currentLine)
                break
              }
            }
            // Speed throttle: 0 = unlimited; otherwise sleep
            // 1000/speed ms between instructions. Yields the event
            // loop unconditionally every 500 instructions even at
            // unlimited speed so the UI thread stays responsive.
            const runSpeed = get().runSpeed
            if (runSpeed > 0) {
              await new Promise<void>((r) => setTimeout(r, 1000 / runSpeed))
            }
            const prevRegisters = get().registers
            await sim.step()
            if (runSpeed === 0 && i % 500 === 0) {
              const engineState = sim.getState()
              set({ registers: buildSnapshot(engineState, prevRegisters) })
              await new Promise<void>((r) => setTimeout(r, 0))
            } else if (runSpeed > 0) {
              // At any throttled speed, push register updates after
              // every step so the user can watch them tick.
              const engineState = sim.getState()
              set({ registers: buildSnapshot(engineState, prevRegisters) })
            }
          }
          const engineState = sim.getState()
          const prevRegisters = get().registers
          set({
            status:
              sim.isHalted() ? 'halted'
              : (_stopFlag || hitBreakpoint) ? 'paused'
              : 'paused',
            registers: buildSnapshot(engineState, prevRegisters),
          })
          get().refreshMemorySnapshot()
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e)
          set({
            status: 'error',
            runtimeError: { pc: get().registers.pc, message },
          })
        }
      })()
    },

    reset: () => {
      _stopFlag = true
      const sim = _sim
      if (sim) sim.reset()
      const engineState = sim?.getState()
      set({
        status: sim ? 'ready' : 'idle',
        registers: engineState
          ? buildSnapshot(engineState, initialRegisters)
          : initialRegisters,
        consoleOutput: [],
        assemblerErrors: [],
        runtimeError: null,
        // Discarding any pending input — the program isn't waiting
        // anymore. The dangling Promise from readInt/readString never
        // resolves (the simulator was reset out from under it); GC
        // collects when references drop.
        pendingInput: null,
      })
      _stopFlag = false
    },

    stop: () => {
      _stopFlag = true
      set({ status: 'paused' })
    },
  }
})
