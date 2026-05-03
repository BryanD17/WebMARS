// Placeholder — SA-6 fills the bottom panel with a real Console /
// Messages / Problems tab strip backed by the store. Until then we
// reserve the 28px collapsed-band height so the page-level grid stays
// honest about its row template.
export function BottomPanel() {
  return (
    <footer
      aria-label="Bottom panel"
      className="flex h-7 items-center border-t border-divider bg-surface-1 px-3 font-mono text-xs text-ink-3"
      style={{ letterSpacing: '0.04em' }}
    >
      (bottom panel — SA-6 wires console / messages / problems)
    </footer>
  )
}
