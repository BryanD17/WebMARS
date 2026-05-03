// Placeholder — SA-1 commit 2 fills in the File / Edit / View / Run /
// Tools / Settings / Help dropdowns. For now just a 32px strip with the
// brand on the left and an empty menu region.
export function MenuBar() {
  return (
    <header
      role="menubar"
      aria-label="Application menu"
      className="flex h-8 items-center border-b border-divider bg-surface-1 px-3 font-display text-xs text-ink-2"
      style={{ letterSpacing: '0.04em' }}
    >
      <span className="mr-4 flex items-center gap-2 text-ink-1">
        <span aria-hidden="true" className="size-2 bg-accent" />
        WebMARS
      </span>
    </header>
  )
}
