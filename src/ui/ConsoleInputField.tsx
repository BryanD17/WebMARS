import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useSimulator, type PendingInput, type PendingInputKind } from '@/hooks/useSimulator.ts'
import { cn } from './cn.ts'

const PLACEHOLDER: Record<PendingInputKind, string> = {
  int:    'Enter an integer (syscall 5)',
  string: 'Enter a string (syscall 8)',
  char:   'Enter a single character (syscall 12)',
}

function validate(kind: PendingInputKind, raw: string, maxLen?: number): string | null {
  const trimmed = raw.trim()
  if (kind === 'int') {
    if (!/^-?\d+$/.test(trimmed)) return 'Must be an integer'
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return 'Must be a 32-bit integer'
    return null
  }
  if (kind === 'char') {
    if (raw.length === 0) return 'Enter one character'
    if (raw.length > 1)   return 'Single character only'
    return null
  }
  // string — only constraint is maxLen if set; truncation is silent
  // on the store side so we just inform the user up-front.
  if (typeof maxLen === 'number' && raw.length > maxLen) {
    return `Will be truncated to ${maxLen} characters`
  }
  return null
}

// Renders below the console body when the simulator is suspended on
// readInt / readString / readChar. The component is REMOUNTED (via
// key={pending} in the parent) whenever the pending reference
// changes, so initial-value reset and focus happen naturally on
// mount instead of via setState-in-effect.
export function ConsoleInputField({ pending }: { pending: PendingInput }) {
  const submitInput = useSimulator((s) => s.submitInput)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Mount-only focus — DOM focus is an external system, not React
  // state, so calling it from an effect is correct usage.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const error  = validate(pending.kind, value, pending.maxLen)
  // For 'string', maxLen warnings are soft (we'll just truncate).
  const isHardError = error !== null && pending.kind !== 'string'

  function handleSubmit() {
    if (isHardError) return
    submitInput(value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      role="region"
      aria-label="Console input"
      className="flex flex-none flex-col border-t border-divider bg-surface-elev px-3 py-1.5 font-mono text-xs"
    >
      {error !== null && (
        <div
          className={cn(
            'mb-1 text-[10px]',
            isHardError ? 'text-danger' : 'text-warn',
          )}
          style={{ letterSpacing: '0.04em' }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-accent">›</span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER[pending.kind]}
          aria-label={PLACEHOLDER[pending.kind]}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className={cn(
            'flex-1 bg-transparent font-mono text-xs text-ink-1 placeholder:text-ink-3 focus:outline-none',
            isHardError && 'text-danger',
          )}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isHardError}
          className={cn(
            'rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
            isHardError
              ? 'cursor-not-allowed bg-surface-2 text-ink-3'
              : 'bg-accent text-surface-0 hover:opacity-90',
          )}
          style={{ letterSpacing: '0.06em' }}
        >
          Submit
        </button>
      </div>
    </div>
  )
}
