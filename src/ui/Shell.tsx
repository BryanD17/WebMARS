import { MenuBar } from './MenuBar.tsx'
import { Toolbar } from './Toolbar.tsx'
import { TabStrip } from './TabStrip.tsx'
import { LeftRail } from './LeftRail.tsx'
import { RightPanel } from './RightPanel.tsx'
import { BottomPanel } from './BottomPanel.tsx'
import { SourcePane } from './SourcePane.tsx'
import { StatusBar } from './StatusBar.tsx'
import { DevPanel } from './DevPanel.tsx'

// 5-band command-center layout:
//   Band 1  Menu Bar        32px
//   Band 2  Primary Toolbar 44px
//   Band 3  Tab Strip       36px
//   Band 4  Workspace       1fr  (Left rail / Center / Right panel, with
//                                  bottom panel docked under center)
//   Band 5  Status Bar      24px
//
// Every level uses min-h-0 + overflow-hidden so internal scroll works.
// SA-2 → SA-16 fill in the placeholders these components currently
// render.
export function Shell() {
  return (
    <>
      <div className="grid h-dvh grid-rows-[32px_44px_36px_1fr_24px] overflow-hidden bg-surface-0 text-ink-1">
        <MenuBar />
        <Toolbar />
        <TabStrip />
        <div className="grid min-h-0 grid-cols-[auto_1fr_360px] overflow-hidden">
          <LeftRail />
          <div className="grid min-h-0 grid-rows-[1fr_auto] overflow-hidden">
            <SourcePane />
            <BottomPanel />
          </div>
          <RightPanel />
        </div>
        <StatusBar />
      </div>
      {import.meta.env.DEV && <DevPanel />}
    </>
  )
}
