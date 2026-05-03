import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

interface ContextMenuState {
  fileId: string
  x: number
  y: number
}

// Multi-file tab strip backed by the file slice. SA-3 commit 2 adds
// HTML5 drag-reorder and a right-click context menu (Close / Close
// Others / Close All) on top of the click-to-switch + close [×] +
// modified-dot UI from commit 1. Arrow-key focus + overflow chevrons
// land in commit 3.
export function TabStrip() {
  const files         = useSimulator((s) => s.files)
  const activeFileId  = useSimulator((s) => s.activeFileId)
  const newFile       = useSimulator((s) => s.newFile)
  const setActive     = useSimulator((s) => s.setActiveFile)
  const closeFile     = useSimulator((s) => s.closeFile)
  const closeAll      = useSimulator((s) => s.closeAll)
  const reorderFiles  = useSimulator((s) => s.reorderFiles)

  const [draggingId, setDraggingId]   = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  function focusTab(id: string): void {
    const el = tabRefs.current.get(id)
    if (el) el.focus()
  }

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (files.length === 0) return
    const currentIndex = files.findIndex((f) => f.id === activeFileId)
    if (currentIndex === -1) return

    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % files.length
        break
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + files.length) % files.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = files.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const next = files[nextIndex]
    if (!next) return
    setActive(next.id)
    focusTab(next.id)
  }

  // Click outside / Escape closes the context menu.
  useEffect(() => {
    if (contextMenu === null) return
    function handleClick() { setContextMenu(null) }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [contextMenu])

  function handleDragStart(event: DragEvent<HTMLButtonElement>, fileId: string) {
    setDraggingId(fileId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', fileId)
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>, targetId: string) {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain')
    setDraggingId(null)
    if (!sourceId || sourceId === targetId) return
    const fromIndex = files.findIndex((f) => f.id === sourceId)
    const toIndex   = files.findIndex((f) => f.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    reorderFiles(fromIndex, toIndex)
  }

  function handleContextMenu(event: ReactMouseEvent<HTMLButtonElement>, fileId: string) {
    event.preventDefault()
    setContextMenu({ fileId, x: event.clientX, y: event.clientY })
  }

  async function closeOthers(keepId: string): Promise<void> {
    const ids = files.map((f) => f.id).filter((id) => id !== keepId)
    for (const id of ids) {
      await closeFile(id)
    }
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Open files"
        onKeyDown={handleTabKeyDown}
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
              const dragging = draggingId === file.id
              return (
                <button
                  key={file.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  draggable
                  ref={(node) => {
                    if (node) tabRefs.current.set(file.id, node)
                    else tabRefs.current.delete(file.id)
                  }}
                  onClick={() => setActive(file.id)}
                  onContextMenu={(event) => handleContextMenu(event, file.id)}
                  onDragStart={(event) => handleDragStart(event, file.id)}
                  onDragOver={handleDragOver}
                  onDrop={(event) => handleDrop(event, file.id)}
                  onDragEnd={() => setDraggingId(null)}
                  title={`${file.name}${file.modified ? ' • unsaved' : ''}`}
                  className={cn(
                    'group flex min-w-[120px] max-w-[200px] flex-none items-center gap-2 border-b-2 pl-3 pr-1 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                    selected
                      ? 'border-accent bg-surface-1 text-ink-1'
                      : 'border-transparent text-ink-3 hover:text-ink-2',
                    dragging && 'opacity-40',
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

      {contextMenu !== null && (
        <div
          role="menu"
          aria-label="Tab actions"
          // Stop the click-outside listener from firing immediately
          // when the menu is itself clicked.
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 50,
          }}
          className="min-w-[10rem] rounded-md border border-divider bg-surface-elev py-1 font-mono text-xs shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const id = contextMenu.fileId
              setContextMenu(null)
              void closeFile(id)
            }}
            className="block w-full px-3 py-1 text-left text-ink-2 hover:bg-surface-3 hover:text-ink-1"
          >
            Close
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const id = contextMenu.fileId
              setContextMenu(null)
              void closeOthers(id)
            }}
            className="block w-full px-3 py-1 text-left text-ink-2 hover:bg-surface-3 hover:text-ink-1"
          >
            Close Others
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setContextMenu(null)
              void closeAll()
            }}
            className="block w-full px-3 py-1 text-left text-ink-2 hover:bg-surface-3 hover:text-ink-1"
          >
            Close All
          </button>
        </div>
      )}
    </>
  )
}
