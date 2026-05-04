import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulator, type RecentFile, type ThemeName, type NumberBase } from '@/hooks/useSimulator.ts'
import { runEditorAction } from '@/lib/editorActions.ts'
import { REPO_URL, ISSUES_URL } from '@/lib/constants.ts'
import { cn } from './cn.ts'

// Each menu item is either a clickable action, a disabled placeholder
// (for actions wired in later sub-agents), or a separator.
type MenuItem =
  | { kind: 'action'; label: string; shortcut?: string; onClick?: () => void; disabled?: boolean }
  | { kind: 'separator' }

// Lightweight relative-time helper for the Open Recent submenu —
// "5m" / "2h" / "3d". Anything beyond a week falls back to ISO date.
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, (Date.now() - then) / 1000)
  if (seconds < 60)         return `${Math.floor(seconds)}s`
  if (seconds < 3600)       return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400)      return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800)     return `${Math.floor(seconds / 86400)}d`
  return iso.slice(0, 10)
}

interface MenuDef {
  label: string
  items: MenuItem[]
}

// SA-2 → SA-15 wire the onClick handlers; for SA-1 every item is
// disabled with a clear "wired in SA-N" marker so the menubar reads
// as scaffolded but inert. Adding a real handler in a later sub-agent
// is a one-line edit (replace `disabled: true` with `onClick: ...`).
//
// Exception: SA-1 commit 5 wires the View menu's three layout toggles
// because the layout slice is now in the store; everything else stays
// disabled until its sub-agent lands.
function buildMenus(actions: {
  toggleLeftRail: () => void
  toggleRightPanel: () => void
  toggleBottomPanel: () => void
  newFile: () => void
  openFromDisk: () => Promise<void>
  saveActive: () => Promise<void>
  saveActiveAs: () => Promise<void>
  saveAll: () => Promise<void>
  closeActive: () => Promise<void>
  closeAll: () => Promise<void>
  recentFiles: ReadonlyArray<RecentFile>
  openSettings: () => void
  setTheme: (next: ThemeName) => void
  setNumberBase: (next: NumberBase) => void
  openInstructionCounter: () => void
  // Phase 3 SA-9 / SA-11 wiring
  assemble: () => void
  run: () => void
  pause: () => void
  step: () => void
  backstep: () => void
  reset: () => void
  openCommandPalette: () => void
}): ReadonlyArray<MenuDef> {
  // Phase 3 SA-11: external links open in a new tab with proper rel
  // attrs. Internal "in-app destination" items are wired to existing
  // dialog opens (Settings, command palette) until SA-6 ships the
  // dedicated HelpDialog.
  function openExternal(url: string): void {
    if (typeof window === 'undefined') return
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  // Build the File menu's "Open Recent" section dynamically from the
  // store's recentFiles array. Each entry is a menuitem labeled with
  // the filename + a relative timestamp; clicking re-opens the file
  // picker (FS Access API doesn't persist handles across reloads, so
  // we can't auto-load — the picker is the best we can do).
  const recentItems: MenuItem[] =
    actions.recentFiles.length === 0
      ? [{ kind: 'action', label: '(no recent files)', disabled: true }]
      : actions.recentFiles.map((r) => ({
          kind: 'action',
          label: r.name,
          shortcut: relativeTime(r.lastOpened),
          onClick: () => { void actions.openFromDisk() },
        }))

  return [
  {
    label: 'File',
    items: [
      { kind: 'action', label: 'New File',         shortcut: 'Ctrl+N',       onClick: actions.newFile },
      { kind: 'action', label: 'Open…',            shortcut: 'Ctrl+O',       onClick: () => { void actions.openFromDisk() } },
      { kind: 'separator' },
      { kind: 'action', label: 'Save',             shortcut: 'Ctrl+S',       onClick: () => { void actions.saveActive() } },
      { kind: 'action', label: 'Save As…',         shortcut: 'Ctrl+Shift+S', onClick: () => { void actions.saveActiveAs() } },
      { kind: 'action', label: 'Save All',                                   onClick: () => { void actions.saveAll() } },
      { kind: 'separator' },
      { kind: 'action', label: 'Open Recent', disabled: true },
      ...recentItems,
      { kind: 'separator' },
      { kind: 'action', label: 'Close',            shortcut: 'Ctrl+W',       onClick: () => { void actions.closeActive() } },
      { kind: 'action', label: 'Close All',                                  onClick: () => { void actions.closeAll() } },
    ],
  },
  {
    label: 'Edit',
    items: [
      { kind: 'action', label: 'Undo',             shortcut: 'Ctrl+Z',       onClick: () => runEditorAction('undo') },
      { kind: 'action', label: 'Redo',             shortcut: 'Ctrl+Shift+Z', onClick: () => runEditorAction('redo') },
      { kind: 'separator' },
      { kind: 'action', label: 'Find',             shortcut: 'Ctrl+F',       onClick: () => runEditorAction('actions.find') },
      { kind: 'action', label: 'Replace',          shortcut: 'Ctrl+H',       onClick: () => runEditorAction('editor.action.startFindReplaceAction') },
      { kind: 'action', label: 'Go to Line…',      shortcut: 'Ctrl+G',       onClick: () => runEditorAction('editor.action.gotoLine') },
      { kind: 'separator' },
      { kind: 'action', label: 'Toggle Line Comment', shortcut: 'Ctrl+/',    onClick: () => runEditorAction('editor.action.commentLine') },
    ],
  },
  {
    label: 'View',
    items: [
      { kind: 'action', label: 'Toggle Left Rail',     shortcut: 'Ctrl+B',     onClick: actions.toggleLeftRail    },
      { kind: 'action', label: 'Toggle Right Panel',   shortcut: 'Ctrl+Alt+B', onClick: actions.toggleRightPanel  },
      { kind: 'action', label: 'Toggle Bottom Panel',  shortcut: 'Ctrl+J',     onClick: actions.toggleBottomPanel },
      { kind: 'separator' },
      // Phase 3 SA-9: View menu also surfaces the editor's find UI
      // for users who don't know the keyboard shortcut.
      { kind: 'action', label: 'Find / Replace Bar',  shortcut: 'Ctrl+G',     onClick: () => runEditorAction('actions.find') },
      { kind: 'separator' },
      { kind: 'action', label: 'Number Base · Hex',  onClick: () => actions.setNumberBase('hex') },
      { kind: 'action', label: 'Number Base · Dec',  onClick: () => actions.setNumberBase('dec') },
      { kind: 'action', label: 'Number Base · Bin',  onClick: () => actions.setNumberBase('bin') },
    ],
  },
  {
    label: 'Run',
    items: [
      { kind: 'action', label: 'Assemble',         shortcut: 'F3',        onClick: actions.assemble },
      { kind: 'action', label: 'Run',              shortcut: 'F5',        onClick: actions.run },
      { kind: 'action', label: 'Pause',            shortcut: 'F6',        onClick: actions.pause },
      { kind: 'action', label: 'Step',             shortcut: 'F7',        onClick: actions.step },
      { kind: 'action', label: 'Backstep',         shortcut: 'Shift+F7',  onClick: actions.backstep },
      { kind: 'action', label: 'Run to Cursor',    shortcut: 'F8',        disabled: true },
      { kind: 'action', label: 'Toggle Breakpoint',shortcut: 'F9',        disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'Reset',                                    onClick: actions.reset },
    ],
  },
  {
    label: 'Tools',
    items: [
      { kind: 'action', label: 'Instruction Counter', onClick: actions.openInstructionCounter },
      { kind: 'separator' },
      { kind: 'action', label: 'Cache Simulator (Phase 3)',                 disabled: true },
      { kind: 'action', label: 'Memory Reference Visualization (Phase 3)',  disabled: true },
    ],
  },
  {
    label: 'Settings',
    items: [
      { kind: 'action', label: 'Open Settings…', shortcut: 'Ctrl+,', onClick: actions.openSettings },
      { kind: 'separator' },
      { kind: 'action', label: 'Theme · Dark',           onClick: () => actions.setTheme('dark')  },
      { kind: 'action', label: 'Theme · Light',          onClick: () => actions.setTheme('light') },
      { kind: 'action', label: 'Theme · High Contrast',  onClick: () => actions.setTheme('hc')    },
    ],
  },
  {
    label: 'Help',
    items: [
      // Until SA-6 lands the dedicated HelpDialog, "Keyboard
      // Shortcuts" surfaces the command palette which lists every
      // shortcut next to its action.
      { kind: 'action', label: 'Keyboard Shortcuts', shortcut: 'Ctrl+Shift+P', onClick: actions.openCommandPalette },
      { kind: 'separator' },
      { kind: 'action', label: 'View on GitHub',    onClick: () => openExternal(REPO_URL) },
      { kind: 'action', label: 'Report a Bug',      onClick: () => openExternal(ISSUES_URL) },
      { kind: 'separator' },
      // SA-6 will replace this with an in-app About tab.
      { kind: 'action', label: 'About WebMARS',     onClick: () => openExternal(`${REPO_URL}#webmars`) },
    ],
  },
  ]
}

export function MenuBar() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLElement>(null)

  const toggleLeftRail    = useSimulator((s) => s.toggleLeftRail)
  const toggleRightPanel  = useSimulator((s) => s.toggleRightPanel)
  const toggleBottomPanel = useSimulator((s) => s.toggleBottomPanel)
  const newFile           = useSimulator((s) => s.newFile)
  const openFromDisk      = useSimulator((s) => s.openFromDisk)
  const saveActive        = useSimulator((s) => s.saveActive)
  const saveActiveAs      = useSimulator((s) => s.saveActiveAs)
  const saveAll           = useSimulator((s) => s.saveAll)
  const closeFile         = useSimulator((s) => s.closeFile)
  const closeAll          = useSimulator((s) => s.closeAll)
  const activeFileId      = useSimulator((s) => s.activeFileId)
  const recentFiles       = useSimulator((s) => s.recentFiles)
  const openSettings      = useSimulator((s) => s.openSettings)
  const setTheme          = useSimulator((s) => s.setTheme)
  const openTool          = useSimulator((s) => s.openTool)
  const setNumberBase     = useSimulator((s) => s.setNumberBase)
  const assemble          = useSimulator((s) => s.assemble)
  const run               = useSimulator((s) => s.run)
  const pause             = useSimulator((s) => s.pause)
  const step              = useSimulator((s) => s.step)
  const backstep          = useSimulator((s) => s.backstep)
  const reset             = useSimulator((s) => s.reset)
  const openCommandPalette= useSimulator((s) => s.openCommandPalette)

  const closeActive = async (): Promise<void> => {
    if (activeFileId !== null) await closeFile(activeFileId)
  }

  const menus = useMemo(
    () =>
      buildMenus({
        toggleLeftRail,
        toggleRightPanel,
        toggleBottomPanel,
        newFile,
        openFromDisk,
        saveActive,
        saveActiveAs,
        saveAll,
        closeActive,
        closeAll,
        recentFiles,
        openSettings,
        setTheme,
        setNumberBase,
        openInstructionCounter: () => openTool('instructionCounter'),
        assemble, run, pause, step, backstep, reset,
        openCommandPalette,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      toggleLeftRail, toggleRightPanel, toggleBottomPanel,
      newFile, openFromDisk, saveActive, saveActiveAs, saveAll,
      activeFileId, closeFile, closeAll, recentFiles,
      openSettings, setTheme, openTool, setNumberBase,
      assemble, run, pause, step, backstep, reset,
      openCommandPalette,
    ],
  )

  // Click outside or Escape closes the open menu.
  useEffect(() => {
    if (openIndex === null) return

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenIndex(null)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenIndex(null)
    }
    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openIndex])

  return (
    <header
      ref={containerRef}
      role="menubar"
      aria-label="Application menu"
      className="relative flex h-8 items-center gap-1 border-b border-divider bg-surface-1 pl-3 pr-3 font-display text-xs text-ink-2"
      style={{ letterSpacing: '0.04em' }}
    >
      <span className="mr-3 flex items-center gap-2 text-ink-1">
        <span aria-hidden="true" className="size-2 bg-accent" />
        WebMARS
      </span>

      {menus.map((menu, i) => {
        const isOpen = openIndex === i
        return (
          <div key={menu.label} className="relative">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              onMouseEnter={() => {
                // If another menu is open, switch to this one on hover —
                // mirrors VS Code's menubar UX.
                if (openIndex !== null && openIndex !== i) setOpenIndex(i)
              }}
              className={cn(
                'rounded-sm px-2 py-1 transition-colors',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                isOpen
                  ? 'bg-surface-3 text-ink-1'
                  : 'hover:bg-surface-2 hover:text-ink-1',
              )}
            >
              {menu.label}
            </button>

            {isOpen && (
              <div
                role="menu"
                aria-label={menu.label}
                className="absolute left-0 top-full z-40 mt-1 min-w-[14rem] max-h-[60vh] overflow-y-auto rounded-md border border-divider bg-surface-elev py-1 shadow-lg"
              >
                {menu.items.map((item, j) => {
                  if (item.kind === 'separator') {
                    return (
                      <div
                        key={`sep-${j}`}
                        role="separator"
                        aria-hidden="true"
                        className="my-1 border-t border-divider"
                      />
                    )
                  }
                  return (
                    <button
                      key={item.label}
                      role="menuitem"
                      type="button"
                      disabled={item.disabled}
                      onClick={() => {
                        item.onClick?.()
                        setOpenIndex(null)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-6 px-3 py-1 text-left text-xs',
                        'focus-visible:outline-none focus-visible:bg-surface-3',
                        item.disabled
                          ? 'cursor-not-allowed text-ink-3'
                          : 'text-ink-2 hover:bg-surface-3 hover:text-ink-1',
                      )}
                      style={{ letterSpacing: '0' }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span
                          className="font-mono text-[10px] text-ink-3"
                          style={{ letterSpacing: '0.04em' }}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </header>
  )
}
