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
      // I/O syscalls (5, 8) stubbed — full console wiring is a Day 5 task.
      readInt: () => Promise.resolve(0),
      readString: () => Promise.resolve(''),
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
      set({ activeFileId: id, source: target.source })
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
        set({
          status: 'error',
          assemblerErrors: toContractErrors(program.errors),
          runtimeError: null,
        })
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
          for (let i = 0; i < 1_000_000 && !sim.isHalted() && !_stopFlag; i++) {
            const prevRegisters = get().registers
            await sim.step()
            if (i % 500 === 0) {
              const engineState = sim.getState()
              set({ registers: buildSnapshot(engineState, prevRegisters) })
              await new Promise<void>((r) => setTimeout(r, 0))
            }
          }
          const engineState = sim.getState()
          const prevRegisters = get().registers
          set({
            status: sim.isHalted() ? 'halted' : _stopFlag ? 'paused' : 'paused',
            registers: buildSnapshot(engineState, prevRegisters),
          })
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
      })
      _stopFlag = false
    },

    stop: () => {
      _stopFlag = true
      set({ status: 'paused' })
    },
  }
})
