import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

// Each menu item is either a clickable action, a disabled placeholder
// (for actions wired in later sub-agents), or a separator.
type MenuItem =
  | { kind: 'action'; label: string; shortcut?: string; onClick?: () => void; disabled?: boolean }
  | { kind: 'separator' }

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
}): ReadonlyArray<MenuDef> {
  return [
  {
    label: 'File',
    items: [
      { kind: 'action', label: 'New File',         shortcut: 'Ctrl+N',       disabled: true },
      { kind: 'action', label: 'Open…',            shortcut: 'Ctrl+O',       disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'Save',             shortcut: 'Ctrl+S',       disabled: true },
      { kind: 'action', label: 'Save As…',         shortcut: 'Ctrl+Shift+S', disabled: true },
      { kind: 'action', label: 'Save All',                                   disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'Open Recent',                                disabled: true },
      { kind: 'action', label: 'Close',            shortcut: 'Ctrl+W',       disabled: true },
      { kind: 'action', label: 'Close All',                                  disabled: true },
    ],
  },
  {
    label: 'Edit',
    items: [
      { kind: 'action', label: 'Undo',             shortcut: 'Ctrl+Z',       disabled: true },
      { kind: 'action', label: 'Redo',             shortcut: 'Ctrl+Shift+Z', disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'Find',             shortcut: 'Ctrl+F',       disabled: true },
      { kind: 'action', label: 'Replace',          shortcut: 'Ctrl+H',       disabled: true },
      { kind: 'action', label: 'Go to Line…',      shortcut: 'Ctrl+G',       disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'Toggle Line Comment', shortcut: 'Ctrl+/',    disabled: true },
    ],
  },
  {
    label: 'View',
    items: [
      { kind: 'action', label: 'Toggle Left Rail',     shortcut: 'Ctrl+B',     onClick: actions.toggleLeftRail    },
      { kind: 'action', label: 'Toggle Right Panel',   shortcut: 'Ctrl+Alt+B', onClick: actions.toggleRightPanel  },
      { kind: 'action', label: 'Toggle Bottom Panel',  shortcut: 'Ctrl+J',     onClick: actions.toggleBottomPanel },
      { kind: 'separator' },
      { kind: 'action', label: 'Number Base · Hex',                            disabled: true },
      { kind: 'action', label: 'Number Base · Dec',                            disabled: true },
      { kind: 'action', label: 'Number Base · Bin',                            disabled: true },
    ],
  },
  {
    label: 'Run',
    items: [
      { kind: 'action', label: 'Assemble',         shortcut: 'F3',        disabled: true },
      { kind: 'action', label: 'Run',              shortcut: 'F5',        disabled: true },
      { kind: 'action', label: 'Pause',            shortcut: 'F6',        disabled: true },
      { kind: 'action', label: 'Step',             shortcut: 'F7',        disabled: true },
      { kind: 'action', label: 'Backstep',         shortcut: 'Shift+F7',  disabled: true },
      { kind: 'action', label: 'Run to Cursor',    shortcut: 'F8',        disabled: true },
      { kind: 'action', label: 'Toggle Breakpoint',shortcut: 'F9',        disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'Reset',            shortcut: 'Ctrl+R',    disabled: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { kind: 'action', label: 'Instruction Counter',                       disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'Cache Simulator (Phase 3)',                 disabled: true },
      { kind: 'action', label: 'Memory Reference Visualization (Phase 3)',  disabled: true },
    ],
  },
  {
    label: 'Settings',
    items: [
      { kind: 'action', label: 'Open Settings…', shortcut: 'Ctrl+,',  disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'Theme · Dark',                       disabled: true },
      { kind: 'action', label: 'Theme · Light',                      disabled: true },
      { kind: 'action', label: 'Theme · High Contrast',              disabled: true },
    ],
  },
  {
    label: 'Help',
    items: [
      { kind: 'action', label: 'Keyboard Shortcuts', shortcut: '?',  disabled: true },
      { kind: 'separator' },
      { kind: 'action', label: 'GitHub Repository',                  disabled: true },
      { kind: 'action', label: 'About WebMARS',                      disabled: true },
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

  const menus = useMemo(
    () => buildMenus({ toggleLeftRail, toggleRightPanel, toggleBottomPanel }),
    [toggleLeftRail, toggleRightPanel, toggleBottomPanel],
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
                className="absolute left-0 top-full z-40 mt-1 min-w-[14rem] rounded-md border border-divider bg-surface-elev py-1 shadow-lg"
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
