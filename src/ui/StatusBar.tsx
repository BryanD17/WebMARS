const APP_VERSION = 'v0.1.0-dev'

export function StatusBar() {
  return (
    <footer className="flex h-7 items-center justify-between border-t border-divider bg-surface-1 px-4 text-xs text-ink-2">
      <span>Ready</span>
      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-ink-3">
        {APP_VERSION}
      </span>
    </footer>
  )
}
