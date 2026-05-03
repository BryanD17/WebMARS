// Tiny holder for "what line is the editor cursor on right now?".
// CodeEditor.tsx registers a reader function in its onMount; Toolbar
// calls getEditorCursor() to snapshot the cursor line for the
// Run-to-cursor button. Lighter-weight than threading an editor ref
// through the React tree.

type CursorReader = () => number | null

let reader: CursorReader | null = null

export function setEditorCursorReader(fn: CursorReader | null): void {
  reader = fn
}

export function getEditorCursor(): number | null {
  return reader ? reader() : null
}
