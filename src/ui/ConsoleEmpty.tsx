// Empty-state for the Console tab. The literal block cursor "▌"
// blinks via the @keyframes blink rule defined in tokens.css.
// Day 2-3 replaces this with the real syscall output stream.

export function ConsoleEmpty() {
  return (
    <div className="font-mono text-sm text-ink-3">
      <span>$ Awaiting program output…</span>
      <span
        aria-hidden="true"
        className="ml-1 inline-block animate-[blink_1.2s_step-end_infinite]"
      >
        ▌
      </span>
    </div>
  )
}
