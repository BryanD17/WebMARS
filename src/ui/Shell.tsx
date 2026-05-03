import { useEffect } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { MenuBar } from './MenuBar.tsx'
import { Toolbar } from './Toolbar.tsx'
import { TabStrip } from './TabStrip.tsx'
import { LeftRail } from './LeftRail.tsx'
import { RightPanel } from './RightPanel.tsx'
import { BottomPanel } from './BottomPanel.tsx'
import { SourcePane } from './SourcePane.tsx'
import { StatusBar } from './StatusBar.tsx'
import { DevPanel } from './DevPanel.tsx'
import { SettingsDialog } from './SettingsDialog.tsx'

// 5-band command-center layout. Workspace columns and rows expand and
// collapse based on the layout slice (right panel open / bottom panel
// open). Persisted to webmars:layout via the store; defaults read
// viewport width on first paint to pick reasonable values for laptops
// vs. ultrawides.
export function Shell() {
  const rightPanelOpen   = useSimulator((s) => s.rightPanelOpen)
  const bottomPanelOpen  = useSimulator((s) => s.bottomPanelOpen)
  const theme            = useSimulator((s) => s.theme)

  // Apply theme via documentElement.dataset.theme. tokens.css scopes
  // light + HC overrides under [data-theme="…"] selectors so every
  // var(--…) reader picks up the new value without code changes.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Block accidental tab close / reload when any file is modified.
  // Reads state imperatively via getState() so the effect doesn't
  // re-bind on every file change (the listener is registered once,
  // checks the latest state when triggered).
  useEffect(() => {
    function handler(event: BeforeUnloadEvent) {
      const dirty = useSimulator.getState().files.some((f) => f.modified)
      if (!dirty) return
      event.preventDefault()
      // Browser-displayed message is no longer customizable for
      // security reasons; setting returnValue is what triggers the
      // legacy "leave site?" prompt in older Chromium / Safari.
      event.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const workspaceCols = rightPanelOpen
    ? 'grid-cols-[auto_1fr_360px]'
    : 'grid-cols-[auto_1fr]'

  const centerRows = bottomPanelOpen
    ? 'grid-rows-[1fr_auto]'
    : 'grid-rows-[1fr_28px]'

  return (
    <>
      <div className="grid h-dvh grid-rows-[32px_44px_36px_1fr_24px] overflow-hidden bg-surface-0 text-ink-1">
        <MenuBar />
        <Toolbar />
        <TabStrip />
        <div className={`grid min-h-0 ${workspaceCols} overflow-hidden`}>
          <LeftRail />
          <div className={`grid min-h-0 ${centerRows} overflow-hidden`}>
            <SourcePane />
            <BottomPanel />
          </div>
          {rightPanelOpen && <RightPanel />}
        </div>
        <StatusBar />
      </div>
      {import.meta.env.DEV && <DevPanel />}
      <SettingsDialog />
    </>
  )
}
