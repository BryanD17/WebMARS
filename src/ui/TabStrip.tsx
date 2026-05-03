import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

// Multi-file tab strip backed by the file slice from SA-2. Each tab
// is a focusable button (role="tab") with a modified dot, truncating
// filename, and inline close [×]. The "+" button on the left calls
// newFile(). Drag-reorder and right-click context menu land in
// SA-3 commit 2; arrow-key focus + overflow chevrons land in commit 3.
export function TabStrip() {
  const files        = useSimulator((s) => s.files)
  const activeFileId = useSimulator((s) => s.activeFileId)
  const newFile      = useSimulator((s) => s.newFile)
  const setActive    = useSimulator((s) => s.setActiveFile)
  const closeFile    = useSimulator((s) => s.closeFile)

  return (
    <div
      role="tablist"
      aria-label="Open files"
      className="flex h-9 items-stretch border-b border-divider bg-surface-0 font-mono text-xs"
      style={{ letterSpacing: '0.04em' }}
    >
      <button
        type="button"
        onClick={newFile}
        title="New file (Ctrl+N — keybinding wires in SA-14)"
        className="flex w-9 flex-none items-center justify-center text-ink-3 transition-colors hover:bg-surface-1 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        aria-label="New file"
      >
        +
      </button>

      {files.length === 0 ? (
        <span className="flex items-center px-3 text-ink-3">(no files open)</span>
      ) : (
        <div className="flex flex-1 items-stretch overflow-x-auto">
          {files.map((file) => {
            const selected = file.id === activeFileId
            return (
              <button
                key={file.id}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(file.id)}
                title={`${file.name}${file.modified ? ' • unsaved' : ''}`}
                className={cn(
                  'group flex min-w-[120px] max-w-[200px] flex-none items-center gap-2 border-b-2 pl-3 pr-1 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                  selected
                    ? 'border-accent bg-surface-1 text-ink-1'
                    : 'border-transparent text-ink-3 hover:text-ink-2',
                )}
              >
                {file.modified && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-1.5 flex-none rounded-pill',
                      selected ? 'bg-accent' : 'bg-ink-3',
                    )}
                  />
                )}
                <span className="flex-1 truncate text-left">{file.name}</span>
                <span
                  role="button"
                  aria-label={`Close ${file.name}`}
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation()
                    void closeFile(file.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      void closeFile(file.id)
                    }
                  }}
                  className={cn(
                    'flex size-5 flex-none items-center justify-center rounded-sm text-base leading-none transition-opacity',
                    'hover:bg-surface-3 hover:text-ink-1',
                    selected || file.modified
                      ? 'opacity-70'
                      : 'opacity-0 group-hover:opacity-70',
                  )}
                >
                  ×
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
