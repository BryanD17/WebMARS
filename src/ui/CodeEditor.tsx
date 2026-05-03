import { useEffect, useRef } from 'react'
import { Editor, type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { registerMips } from '@/lib/mipsLanguage.ts'
import { JUMP_TO_LINE_EVENT, type JumpToLineDetail } from '@/lib/jumpToLine.ts'

// Wraps @monaco-editor/react with the WebMARS MIPS language + dark
// theme + IDE-density editor options. Replaces SourcePane's previous
// textarea + custom gutter + custom column guide — Monaco brings all
// of those natively (line numbers, rulers, minimap, smooth cursor,
// bracket matching, multi-cursor, find/replace, undo/redo).
//
// SA-4 commit 3 adds assembler error decorations via Monaco's native
// marker API (red squiggles + overview ruler dots + hover messages).
//
// Source flows through the existing store contract: `source` for the
// active file's content, `setSource(next)` for edits. Both are wired
// to the multi-file slice from SA-2 (writes mirror to the active
// file's entry in `files` and flip its modified flag).
export function CodeEditor() {
  const source           = useSimulator((s) => s.source)
  const setSource        = useSimulator((s) => s.setSource)
  const assemblerErrors  = useSimulator((s) => s.assemblerErrors)

  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)

  function handleBeforeMount(monaco: Monaco): void {
    registerMips(monaco)
    monacoRef.current = monaco
  }

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
  }

  // Apply / clear assembler-error markers whenever the error array
  // changes. Monaco's setModelMarkers with an owner string makes
  // updates atomic — passing an empty array clears just our markers
  // without touching anything else (e.g., future runtime markers).
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    const model = editor.getModel()
    if (!model) return

    const markers: monacoEditor.IMarkerData[] = assemblerErrors.map((err) => ({
      severity: monaco.MarkerSeverity.Error,
      message: err.message,
      startLineNumber: err.line,
      endLineNumber:   err.line,
      startColumn:     1,
      endColumn:       Number.MAX_SAFE_INTEGER,
      source:          'webmars-assembler',
    }))

    monaco.editor.setModelMarkers(model, 'webmars-assembler', markers)
  }, [assemblerErrors])

  // Listen for the JUMP_TO_LINE_EVENT dispatched by Problems /
  // Messages panels — reveal the line, place the cursor at column 1
  // (or the requested column), and focus the editor so subsequent
  // keystrokes land in the right place.
  useEffect(() => {
    function handler(event: Event) {
      const detail = (event as CustomEvent<JumpToLineDetail>).detail
      if (!detail || typeof detail.line !== 'number') return
      const editor = editorRef.current
      if (!editor) return
      editor.revealLineInCenterIfOutsideViewport(detail.line)
      editor.setPosition({ lineNumber: detail.line, column: detail.column ?? 1 })
      editor.focus()
    }
    window.addEventListener(JUMP_TO_LINE_EVENT, handler)
    return () => window.removeEventListener(JUMP_TO_LINE_EVENT, handler)
  }, [])

  return (
    <Editor
      height="100%"
      language="mips"
      theme="webmars-dark"
      value={source}
      onChange={(value) => setSource(value ?? '')}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
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
