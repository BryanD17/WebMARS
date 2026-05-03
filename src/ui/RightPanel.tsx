import { InspectorPane } from './InspectorPane.tsx'

// SA-1 commit 4 restructures this into an accordion (Registers /
// Memory / Watches / Call Stack). Until then we mount the existing
// InspectorPane inside the 360px band so the registers / memory /
// console tabs remain usable.
export function RightPanel() {
  return (
    <aside
      aria-label="Inspector panel"
      className="flex min-h-0 min-w-0 flex-col overflow-hidden border-l border-divider bg-surface-1"
    >
      <InspectorPane />
    </aside>
  )
}
