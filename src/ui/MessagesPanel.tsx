import { useSimulator, type BottomMessage, type BottomMessageLevel } from '@/hooks/useSimulator.ts'
import { jumpToLine } from '@/lib/jumpToLine.ts'
import { cn } from './cn.ts'

const LEVEL_GLYPH: Record<BottomMessageLevel, string> = {
  info:  'ℹ',
  warn:  '⚠',
  error: '✕',
}

const LEVEL_COLOR: Record<BottomMessageLevel, string> = {
  info:  'text-ink-2',
  warn:  'text-warn',
  error: 'text-danger',
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function MessageRow({ message }: { message: BottomMessage }) {
  const clickable = message.line !== undefined
  const Element = clickable ? 'button' : 'div'
  return (
    <Element
      type={clickable ? 'button' : undefined}
      onClick={clickable ? () => jumpToLine(message.line!) : undefined}
      title={clickable ? `Jump to line ${String(message.line)}` : undefined}
      className={cn(
        'flex w-full items-baseline gap-3 px-3 py-1 text-left font-mono text-xs',
        clickable && 'cursor-pointer hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2',
      )}
    >
      <span
        aria-hidden="true"
        className="flex-none font-mono text-[10px] text-ink-3"
        style={{ letterSpacing: '0.04em' }}
      >
        {formatTime(message.ts)}
      </span>
      <span aria-hidden="true" className={cn('flex-none', LEVEL_COLOR[message.level])}>
        {LEVEL_GLYPH[message.level]}
      </span>
      <span className="flex-1 text-ink-1">{message.text}</span>
      {clickable && (
        <span
          aria-hidden="true"
          className="flex-none font-mono text-[10px] text-ink-3"
          style={{ letterSpacing: '0.04em' }}
        >
          line {message.line}
        </span>
      )}
    </Element>
  )
}

export function MessagesPanel() {
  const messages      = useSimulator((s) => s.messages)
  const clearMessages = useSimulator((s) => s.clearMessages)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-6 flex-none items-center gap-2 border-b border-divider px-2 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <button
          type="button"
          onClick={clearMessages}
          disabled={messages.length === 0}
          className={cn(
            'rounded-sm px-2 py-0.5 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
            messages.length === 0
              ? 'cursor-not-allowed text-ink-3'
              : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
          )}
        >
          Clear
        </button>
        <span aria-hidden="true" className="ml-auto text-ink-3">
          {messages.length} message{messages.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {messages.length === 0 ? (
          <div className="px-3 py-2 text-xs italic text-ink-3">
            No messages yet. Run-state transitions and assemble events appear here.
          </div>
        ) : (
          // Newest at top so users see fresh activity without scrolling.
          messages
            .slice()
            .reverse()
            .map((m) => <MessageRow key={m.id} message={m} />)
        )}
      </div>
    </div>
  )
}
