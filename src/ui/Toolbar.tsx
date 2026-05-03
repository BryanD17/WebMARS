import { ControlBar } from './ControlBar.tsx'

// SA-1 commit 3 replaces this temporary delegation with a proper
// grouped Toolbar (file ops / edit ops / assemble+run / speed slider /
// view modes / search). For now we mount the existing ControlBar inside
// the 44px band so functionality (Assemble / Run / Step / Reset +
// StatusPill) is preserved across commits.
export function Toolbar() {
  return (
    <div
      role="toolbar"
      aria-label="Primary toolbar"
      className="border-b border-divider bg-surface-1"
    >
      <ControlBar />
    </div>
  )
}
