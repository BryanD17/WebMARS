// Placeholder — SA-1 commit 4 adds the icon rail; SA-9 / SA-11 fill in
// the breakpoints, symbols, and reference panels behind it. For SA-1
// the rail collapses to its 48px icon column.
export function LeftRail() {
  return (
    <aside
      aria-label="Left rail"
      className="flex w-12 flex-none flex-col items-center gap-2 border-r border-divider bg-surface-1 py-3 text-ink-3"
    >
      <span aria-hidden="true" className="font-mono text-[10px]">
        ⋯
      </span>
    </aside>
  )
}
