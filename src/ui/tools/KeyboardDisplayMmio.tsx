import { useEffect, useRef, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { cn } from '../cn.ts'

// Phase 3 SA-13: Keyboard / Display MMIO tool. Top half captures
// keystrokes and pushes them into the engine's receiver register
// (0xffff0004). Bottom half receives any character the program
// writes to the transmitter register (0xffff000c) and appends it
// to a textarea.
//
// Connect/disconnect toggles the tool's subscription to the
// simulator's transmitter handler so the textarea doesn't fill in
// unattended sessions.

export function KeyboardDisplayMmio() {
  const open               = useSimulator((s) => s.toolsDialog === 'mmio')
  const closeTool          = useSimulator((s) => s.closeTool)
  const pushKeystroke      = useSimulator((s) => s.pushKeystroke)
  const setMmioTransmitter = useSimulator((s) => s.setMmioTransmitter)

  const [connected, setConnected] = useState(true)
  const [display, setDisplay] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const displayRef = useRef<HTMLTextAreaElement | null>(null)

  // Subscribe the engine's transmitter callback to our state setter
  // when connected. Disconnecting unsubscribes so the simulator's
  // store-set noise stops landing here.
  useEffect(() => {
    if (!open) return
    if (!connected) {
      setMmioTransmitter(null)
      return
    }
    setMmioTransmitter((char) => {
      setDisplay((prev) => prev + String.fromCharCode(char))
    })
    return () => setMmioTransmitter(null)
  }, [open, connected, setMmioTransmitter])

  // Auto-scroll the display textarea to the bottom on new chars.
  useEffect(() => {
    const el = displayRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [display])

  // Esc closes the modal.
  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeTool()
    }
    window.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, closeTool])

  if (!open) return null

  function handleKeystroke(event: React.KeyboardEvent<HTMLInputElement>): void {
    // Send single printable characters or Enter (\n). Skip modifier
    // events so the user can Ctrl+A, etc., without sending control
    // characters into the receiver.
    if (event.ctrlKey || event.metaKey || event.altKey) return
    let char: number | null = null
    if (event.key.length === 1) char = event.key.charCodeAt(0)
    else if (event.key === 'Enter') char = 10
    else if (event.key === 'Backspace') char = 8
    else if (event.key === 'Tab') char = 9
    if (char === null) return
    event.preventDefault()
    pushKeystroke(char)
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeTool() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard / Display MMIO Simulator"
        tabIndex={-1}
        className={cn(
          'flex h-[36rem] w-[44rem] flex-col overflow-hidden rounded-lg border border-divider bg-surface-1 shadow-xl',
          'focus-visible:outline-none',
        )}
      >
        <header className="flex h-10 flex-none items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-2 text-sm text-ink-1">
            <span aria-hidden="true">⌨</span>
            Keyboard / Display MMIO
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConnected((c) => !c)}
              className={cn(
                'rounded-sm border px-2 py-0.5 text-[11px] transition-colors',
                connected
                  ? 'border-ok bg-ok/10 text-ok'
                  : 'border-divider bg-surface-2 text-ink-2 hover:bg-surface-3',
              )}
            >
              {connected ? '● Connected' : '○ Disconnected'}
            </button>
            <button
              type="button"
              onClick={closeTool}
              aria-label="Close"
              title="Close (Esc)"
              className="rounded-sm px-2 py-0.5 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              ×
            </button>
          </div>
        </header>

        {/* Keyboard input pane */}
        <section className="flex flex-1 flex-col border-b border-divider px-4 py-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>
              Keyboard (writes to receiver at 0xffff0004)
            </span>
          </div>
          <input
            type="text"
            placeholder="Click here, then type to send keystrokes…"
            onKeyDown={handleKeystroke}
            disabled={!connected}
            className={cn(
              'flex-none rounded-sm border border-divider bg-surface-2 px-3 py-2 font-mono text-sm text-ink-1',
              'placeholder:text-ink-3 focus-visible:outline-none focus-visible:border-accent',
              !connected && 'opacity-50',
            )}
          />
          <p className="mt-1 text-[10px] italic text-ink-3">
            Each keystroke sets the receiver-ready bit. Your program reads 0xffff0000 to poll, then 0xffff0004 to consume the character.
          </p>
        </section>

        {/* Display output pane */}
        <section className="flex flex-1 flex-col px-4 py-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>
              Display (chars written to transmitter at 0xffff000c)
            </span>
            <button
              type="button"
              onClick={() => setDisplay('')}
              disabled={display.length === 0}
              className={cn(
                'rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase transition-colors',
                display.length === 0
                  ? 'cursor-not-allowed text-ink-3'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink-1',
              )}
              style={{ letterSpacing: '0.06em' }}
            >
              Clear
            </button>
          </div>
          <textarea
            ref={displayRef}
            value={display}
            readOnly
            className="flex-1 resize-none rounded-sm border border-divider bg-surface-2 px-3 py-2 font-mono text-sm text-ink-1 focus-visible:outline-none"
          />
        </section>
      </div>
    </div>
  )
}
