import { useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { SourcePane } from './SourcePane.tsx'
import { RegisterTable } from './RegisterTable.tsx'
import { MemoryPanel } from './MemoryPanel.tsx'
import { ConsolePanel } from './ConsolePanel.tsx'
import { StatusBar } from './StatusBar.tsx'
import { SettingsDialog } from './SettingsDialog.tsx'
import { HelpDialog } from './HelpDialog.tsx'
import { CommandPalette } from './CommandPalette.tsx'
import { cn } from './cn.ts'

// Phase 3 SA-16: full mobile layout. Replaces the previous "read-
// only editor + apologetic banner" with a real tabbed interface
// (Editor / Registers / Memory / Console), a hamburger drawer for
// file and tool actions, and a bottom control bar with the
// assemble / run / pause / step / reset operations.
//
// The editor is read-only by default — typing assembly on a phone
// is painful — with an Edit toggle in the header for users who
// really want to.

const TABS: ReadonlyArray<{ id: 'editor' | 'registers' | 'memory' | 'console'; label: string }> = [
  { id: 'editor',    label: 'Editor'    },
  { id: 'registers', label: 'Registers' },
  { id: 'memory',    label: 'Memory'    },
  { id: 'console',   label: 'Console'   },
]

function ControlBarButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-1 items-center justify-center text-[11px] font-medium transition-colors',
        disabled
          ? 'cursor-not-allowed text-ink-3'
          : 'text-ink-1 hover:bg-surface-3 active:bg-surface-3',
      )}
    >
      {label}
    </button>
  )
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const newFile         = useSimulator((s) => s.newFile)
  const openFromDisk    = useSimulator((s) => s.openFromDisk)
  const saveActive      = useSimulator((s) => s.saveActive)
  const loadFromExample = useSimulator((s) => s.loadFromExample)
  const openSettings    = useSimulator((s) => s.openSettings)
  const openHelp        = useSimulator((s) => s.openHelp)
  const setTheme        = useSimulator((s) => s.setTheme)
  const theme           = useSimulator((s) => s.theme)

  if (!open) return null

  function close(): void { onClose() }

  return (
    <div role="presentation" onClick={close} className="fixed inset-0 z-40 bg-black/50">
      <aside
        role="dialog"
        aria-label="Mobile menu"
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 top-0 h-full w-[80vw] max-w-[20rem] overflow-y-auto bg-surface-1 shadow-xl"
      >
        <header className="flex h-14 items-center justify-between border-b border-divider px-4">
          <span className="font-display text-sm text-ink-1">WebMARS</span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="rounded-sm px-2 py-1 text-base text-ink-2 hover:bg-surface-2 hover:text-ink-1"
          >
            ×
          </button>
        </header>

        <nav className="flex flex-col py-2 text-sm">
          <DrawerSection title="File" />
          <DrawerItem label="New file"          onClick={() => { newFile(); close() }} />
          <DrawerItem label="Open…"             onClick={() => { void openFromDisk(); close() }} />
          <DrawerItem label="Save"              onClick={() => { void saveActive(); close() }} />

          <DrawerSection title="Examples" />
          <DrawerItem label="Array Sum"      onClick={() => { loadFromExample('arraySum');    close() }} />
          <DrawerItem label="Factorial"      onClick={() => { loadFromExample('factorial');   close() }} />
          <DrawerItem label="String Print"   onClick={() => { loadFromExample('stringPrint'); close() }} />
          <DrawerItem label="Sum 1..N"       onClick={() => { loadFromExample('sumToN');      close() }} />
          <DrawerItem label="Syscall I/O"    onClick={() => { loadFromExample('syscallIO');   close() }} />
          <DrawerItem label="Float Math"     onClick={() => { loadFromExample('floatMath');   close() }} />

          <DrawerSection title="Theme" />
          <DrawerItem label={`Dark${theme==='dark'?' ✓':''}`}            onClick={() => { setTheme('dark') }} />
          <DrawerItem label={`Light${theme==='light'?' ✓':''}`}          onClick={() => { setTheme('light') }} />
          <DrawerItem label={`High Contrast${theme==='hc'?' ✓':''}`}     onClick={() => { setTheme('hc') }} />

          <DrawerSection title="Other" />
          <DrawerItem label="Settings"           onClick={() => { openSettings(); close() }} />
          <DrawerItem label="Instruction Help"   onClick={() => { openHelp('basic'); close() }} />
        </nav>
      </aside>
    </div>
  )
}

function DrawerSection({ title }: { title: string }) {
  return (
    <div className="mt-2 px-4 py-1 font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>
      {title}
    </div>
  )
}

function DrawerItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center px-4 text-left text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1"
    >
      {label}
    </button>
  )
}

export function MobileShell() {
  const tab               = useSimulator((s) => s.mobileTab)
  const setTab            = useSimulator((s) => s.setMobileTab)
  const drawerOpen        = useSimulator((s) => s.mobileDrawerOpen)
  const toggleDrawer      = useSimulator((s) => s.toggleMobileDrawer)
  const editAllowed       = useSimulator((s) => s.mobileEditAllowed)
  const toggleEdit        = useSimulator((s) => s.toggleMobileEdit)
  const assemble          = useSimulator((s) => s.assemble)
  const run               = useSimulator((s) => s.run)
  const pause             = useSimulator((s) => s.pause)
  const step              = useSimulator((s) => s.step)
  const reset             = useSimulator((s) => s.reset)
  const status            = useSimulator((s) => s.status)
  // Local theme state mirrored once for the header swatch; the
  // real switch lives in the drawer.
  const [_x] = useState(0)
  void _x

  const canPause = status === 'running'
  const canStep  = status === 'ready' || status === 'paused'

  return (
    <>
      <div className="grid h-dvh grid-rows-[56px_36px_1fr_48px_24px] overflow-hidden bg-surface-0 text-ink-1">
        {/* Header */}
        <header
          className="flex items-center justify-between border-b border-divider bg-surface-1 px-3"
          role="banner"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleDrawer}
              aria-label="Open menu"
              className="flex size-9 items-center justify-center rounded-sm text-ink-1 transition-colors hover:bg-surface-2 active:bg-surface-2"
            >
              ☰
            </button>
            <span className="font-display text-sm text-ink-1" style={{ letterSpacing: '0.04em' }}>WebMARS</span>
          </div>
          {tab === 'editor' && (
            <button
              type="button"
              onClick={toggleEdit}
              className={cn(
                'rounded-sm border px-3 py-1 text-[11px] font-medium transition-colors',
                editAllowed
                  ? 'border-warn bg-warn/10 text-warn'
                  : 'border-divider bg-surface-2 text-ink-2',
              )}
            >
              {editAllowed ? '✎ Editing' : '🔒 Read-only'}
            </button>
          )}
        </header>

        {/* Tab strip */}
        <div role="tablist" aria-label="Mobile view tabs" className="flex items-stretch border-b border-divider bg-surface-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center border-b-2 text-xs uppercase transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                tab === t.id
                  ? 'border-accent text-ink-1'
                  : 'border-transparent text-ink-3 hover:text-ink-2',
              )}
              style={{ letterSpacing: '0.06em' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <main className="overflow-hidden">
          <div hidden={tab !== 'editor'}    className={cn('h-full', tab !== 'editor'    && 'hidden')}><SourcePane /></div>
          <div hidden={tab !== 'registers'} className={cn('h-full overflow-y-auto px-3 py-2', tab !== 'registers' && 'hidden')}><RegisterTable /></div>
          <div hidden={tab !== 'memory'}    className={cn('h-full overflow-y-auto px-3 py-2', tab !== 'memory'    && 'hidden')}><MemoryPanel /></div>
          <div hidden={tab !== 'console'}   className={cn('h-full', tab !== 'console'   && 'hidden')}><ConsolePanel /></div>
        </main>

        {/* Control bar */}
        <nav
          aria-label="Simulator controls"
          className="flex items-stretch divide-x divide-divider border-t border-divider bg-surface-1"
        >
          <ControlBarButton label="Assemble" onClick={assemble} />
          <ControlBarButton label="Run"      onClick={run} />
          <ControlBarButton label="Pause"    onClick={pause}  disabled={!canPause} />
          <ControlBarButton label="Step"     onClick={step}   disabled={!canStep} />
          <ControlBarButton label="Reset"    onClick={reset} />
        </nav>

        <StatusBar />
      </div>

      <Drawer open={drawerOpen} onClose={toggleDrawer} />
      <SettingsDialog />
      <HelpDialog />
      <CommandPalette />
    </>
  )
}
