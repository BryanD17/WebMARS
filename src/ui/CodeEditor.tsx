import { Editor, type Monaco } from '@monaco-editor/react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { registerMips } from '@/lib/mipsLanguage.ts'

// Wraps @monaco-editor/react with the WebMARS MIPS language + dark
// theme + IDE-density editor options. Replaces SourcePane's previous
// textarea + custom gutter + custom column guide — Monaco brings all
// of those natively (line numbers, rulers, minimap, smooth cursor,
// bracket matching, multi-cursor, find/replace, undo/redo).
//
// Source flows through the existing store contract: `source` for the
// active file's content, `setSource(next)` for edits. Both are wired
// to the multi-file slice from SA-2 (writes mirror to the active
// file's entry in `files` and flip its modified flag).
export function CodeEditor() {
  const source    = useSimulator((s) => s.source)
  const setSource = useSimulator((s) => s.setSource)

  function handleBeforeMount(monaco: Monaco): void {
    registerMips(monaco)
  }

  return (
    <Editor
      height="100%"
      language="mips"
      theme="webmars-dark"
      value={source}
      onChange={(value) => setSource(value ?? '')}
      beforeMount={handleBeforeMount}
      loading={
        <div className="flex h-full items-center justify-center font-mono text-xs text-ink-3">
          Loading editor…
        </div>
      }
      options={{
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 13,
        lineHeight: 20,
        lineNumbers: 'on',
        rulers: [80],
        minimap: { enabled: true, side: 'right', renderCharacters: false },
        tabSize: 4,
        insertSpaces: true,
        wordWrap: 'off',
        glyphMargin: true,           // SA-9 attaches breakpoint glyphs here
        folding: true,
        automaticLayout: true,       // resizes when right/bottom panel toggles
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        renderLineHighlight: 'line',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: false },
        suggest: { showWords: false },
        padding: { top: 8, bottom: 8 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
    />
  )
}
