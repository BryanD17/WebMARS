// Placeholder — SA-3 wires this to the multi-file slice. SA-1 commit 4
// adds a basic visual (the empty band reading "(no files)").
export function TabStrip() {
  return (
    <div
      role="tablist"
      aria-label="Open files"
      className="flex h-9 items-center border-b border-divider bg-surface-0 px-3 font-mono text-xs text-ink-3"
    >
      <span style={{ letterSpacing: '0.04em' }}>(no files yet — SA-3 wires this)</span>
    </div>
  )
}
