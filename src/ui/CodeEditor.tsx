import { useEffect, useRef } from 'react'
import { Editor, type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor as monacoEditor } from 'monaco-editor'
import { useSimulator } from '@/hooks/useSimulator.ts'
import { useIsMobile } from '@/hooks/useIsMobile.ts'
import { registerMips } from '@/lib/mipsLanguage.ts'
import { JUMP_TO_LINE_EVENT, type JumpToLineDetail } from '@/lib/jumpToLine.ts'
import { setEditorCursorReader } from '@/lib/editorCursor.ts'
import { setEditorActionRunner } from '@/lib/editorActions.ts'

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
  const breakpoints      = useSimulator((s) => s.breakpoints)
  const editorFontSize   = useSimulator((s) => s.editorFontSize)
  const isMobile         = useIsMobile()

  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const breakpointDecorationsRef = useRef<string[]>([])
  // Phase 3 SA-8: separate decoration set for the hover preview so it
  // doesn't collide with real breakpoint decorations on the same line.
  const hoverPreviewDecorationsRef = useRef<string[]>([])

  function handleBeforeMount(monaco: Monaco): void {
    registerMips(monaco)
    monacoRef.current = monaco
  }

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Wire gutter clicks to toggle breakpoints. We pull
    // toggleBreakpoint imperatively via getState() to avoid stale
    // closure capture (the listener is registered once on mount;
    // store actions are stable Zustand references but reading
    // imperatively keeps the contract obvious).
    editor.onMouseDown((event) => {
      if (event.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = event.target.position?.lineNumber
        if (typeof line === 'number') {
          useSimulator.getState().toggleBreakpoint(line)
        }
      }
    })

    // Phase 3 SA-8: low-opacity preview on gutter hover so users
    // see WHERE they can click before committing a breakpoint.
    // Skip lines that already have a breakpoint (the real glyph
    // is more informative than the preview).
    editor.onMouseMove((event) => {
      if (event.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = event.target.position?.lineNumber
        const existing = useSimulator.getState().breakpoints
        if (typeof line === 'number' && !existing.has(line)) {
          hoverPreviewDecorationsRef.current = editor.deltaDecorations(
            hoverPreviewDecorationsRef.current,
            [{
              range: new monaco.Range(line, 1, line, 1),
              options: { glyphMarginClassName: 'webmars-breakpoint-glyph-preview' },
            }],
          )
          return
        }
      }
      // Off-gutter or over an existing breakpoint — clear any preview.
      if (hoverPreviewDecorationsRef.current.length > 0) {
        hoverPreviewDecorationsRef.current = editor.deltaDecorations(
          hoverPreviewDecorationsRef.current, [],
        )
      }
    })

    // Clear the preview decoration when the mouse leaves the editor
    // entirely (Monaco's onMouseMove fires only over the editor body).
    editor.onMouseLeave(() => {
      if (hoverPreviewDecorationsRef.current.length > 0) {
        hoverPreviewDecorationsRef.current = editor.deltaDecorations(
          hoverPreviewDecorationsRef.current, [],
        )
      }
    })

    // Register the cursor reader so the toolbar's Run-to-cursor
    // button can snapshot the current cursor line without holding
    // a Monaco ref of its own.
    setEditorCursorReader(() => editor.getPosition()?.lineNumber ?? null)

    // Phase 3 SA-9: register an action runner so the global key map
    // and menu items can trigger Monaco built-ins (gotoLine, find,
    // replace) even when the editor isn't the current focus owner.
    // Focusing first guarantees the action's UI lands in the right
    // place.
    setEditorActionRunner((actionId) => {
      editor.focus()
      editor.trigger('webmars-keybindings', actionId, null)
    })
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

  // Sync breakpoint glyph decorations whenever the active file's
  // breakpoint set changes. deltaDecorations replaces the previous
  // batch atomically (returned IDs become the next "previous" set).
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return

    const next = [...breakpoints].map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        glyphMarginClassName: 'webmars-breakpoint-glyph',
        glyphMarginHoverMessage: { value: `Breakpoint at line ${line} — click to remove` },
      },
    }))
    breakpointDecorationsRef.current = editor.deltaDecorations(
      breakpointDecorationsRef.current,
      next,
    )
  }, [breakpoints])

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
        fontSize: editorFontSize,
        // line-height auto-derived from fontSize when 0 — Monaco picks
        // ~1.5x which keeps the gutter glyph centered as the user
        // resizes via the settings dialog.
        lineHeight: 0,
        readOnly: isMobile,
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
