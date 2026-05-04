import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

// Phase 3 follow-up: wires the rail's Project icon. Lists the open
// files with a click-to-activate row, and surfaces the file actions
// (New / Open / Save) without the user having to hunt them down in
// the menu bar.

export function ProjectPanel() {
  const files          = useSimulator((s) => s.files)
  const activeFileId   = useSimulator((s) => s.activeFileId)
  const setActiveFile  = useSimulator((s) => s.setActiveFile)
  const closeFile      = useSimulator((s) => s.closeFile)
  const newFile        = useSimulator((s) => s.newFile)
  const openFromDisk   = useSimulator((s) => s.openFromDisk)
  const saveActive     = useSimulator((s) => s.saveActive)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-7 flex-none items-center justify-between border-b border-divider px-3 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <span className="text-ink-2">Project</span>
        <span className="text-ink-3">{files.length}</span>
      </div>

      <div className="flex-none border-b border-divider p-2">
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={newFile}
            className="rounded-sm bg-surface-2 px-2 py-1 text-[11px] text-ink-1 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="New file (Ctrl+N)"
          >
            New
          </button>
          <button
            type="button"
            onClick={() => { void openFromDisk() }}
            className="rounded-sm bg-surface-2 px-2 py-1 text-[11px] text-ink-1 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Open file (Ctrl+O)"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => { void saveActive() }}
            disabled={activeFileId === null}
            className={cn(
              'rounded-sm px-2 py-1 text-[11px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              activeFileId === null
                ? 'cursor-not-allowed bg-surface-2 text-ink-3'
                : 'bg-surface-2 text-ink-1 hover:bg-surface-3',
            )}
            title="Save active file (Ctrl+S)"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="px-3 py-3 text-xs italic text-ink-3">
            No files open. Click New or Open above.
          </div>
        ) : (
          <ul className="divide-y divide-divider/40">
            {files.map((file) => {
              const active = file.id === activeFileId
              return (
                <li key={file.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveFile(file.id)}
                    className={cn(
                      'flex flex-1 items-center gap-2 px-3 py-1 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:bg-surface-2',
                      active ? 'bg-surface-2 text-ink-1' : 'text-ink-2 hover:bg-surface-2',
                    )}
                    title={`Switch to ${file.name}`}
                  >
                    <span aria-hidden="true" className={cn('size-2 flex-none rounded-pill', file.modified ? 'bg-warn' : 'bg-transparent')} />
                    <span className="flex-1 truncate font-mono text-[11px]">{file.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { void closeFile(file.id) }}
                    aria-label={`Close ${file.name}`}
                    title="Close file"
                    className="size-5 flex-none rounded-sm text-base leading-none text-ink-3 opacity-0 transition-opacity hover:bg-surface-3 hover:text-ink-1 group-hover:opacity-70"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
