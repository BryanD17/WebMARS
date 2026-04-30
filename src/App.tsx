import { ControlBar } from '@/ui/ControlBar.tsx'
import { SourcePane } from '@/ui/SourcePane.tsx'
import { InspectorPane } from '@/ui/InspectorPane.tsx'
import { StatusBar } from '@/ui/StatusBar.tsx'

export default function App() {
  return (
    <div className="grid h-dvh grid-rows-[56px_1fr_28px] bg-surface-0 text-ink-1">
      <ControlBar />
      <div className="grid min-h-0 grid-cols-1 grid-rows-[1fr_320px] lg:grid-cols-[1fr_minmax(360px,480px)] lg:grid-rows-1">
        <SourcePane />
        <InspectorPane />
      </div>
      <StatusBar />
    </div>
  )
}
