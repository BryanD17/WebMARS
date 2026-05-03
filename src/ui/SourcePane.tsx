import { CodeEditor } from './CodeEditor.tsx'

// SourcePane is now a thin section wrapper around CodeEditor (Monaco).
// All the prior custom gutter / line numbers / column guide / focus
// signal / current-line indicator code is gone — Monaco handles every
// one of those natively (and better) via its glyphMargin + lineNumbers
// + rulers + cursor APIs.
export function SourcePane() {
  return (
    <section
      aria-label="Source editor"
      className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-surface-0"
    >
      <CodeEditor />
    </section>
  )
}
