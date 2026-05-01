import { useSimulator } from '@/hooks/useSimulator.ts'

export function SourcePane() {
  const source   = useSimulator((s) => s.source)
  const setSource = useSimulator((s) => s.setSource)
  const errors   = useSimulator((s) => s.assemblerErrors)

  return (
    <section
      aria-label="Source editor"
      className="flex min-h-0 min-w-0 flex-col border-divider bg-surface-1 lg:border-r"
    >
      <label htmlFor="source-editor" className="sr-only">
        MIPS assembly source
      </label>
      <textarea
        id="source-editor"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        placeholder={PLACEHOLDER}
        className="flex-1 resize-none bg-surface-1 px-4 py-3 font-mono text-sm leading-6 text-ink-1 placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      />

      {errors.length > 0 && (
        <div className="border-t border-danger/40 bg-danger/10 px-4 py-2">
          {errors.map((e, i) => (
            <p key={i} className="font-mono text-xs text-danger">
              Line {e.line}: {e.message}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

const PLACEHOLDER = `# MIPS assembly — type here, then click Assemble

.data
msg: .asciiz "Hello, WebMARS!\\n"

.text
main:
    li   $v0, 4
    la   $a0, msg
    syscall
    li   $v0, 10
    syscall`
