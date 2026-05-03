// Tiny event bus for "go to line N in the editor" — used by Problems
// and Messages tabs to jump the editor cursor without holding a
// direct reference to the Monaco instance. CodeEditor.tsx registers
// a window listener for this event and calls revealLineInCenter +
// setPosition + focus.

export const JUMP_TO_LINE_EVENT = 'webmars:jump-to-line'

export interface JumpToLineDetail {
  line: number
  column?: number   // defaults to 1
}

export function jumpToLine(line: number, column?: number): void {
  if (typeof window === 'undefined') return
  const detail: JumpToLineDetail = column !== undefined ? { line, column } : { line }
  window.dispatchEvent(new CustomEvent<JumpToLineDetail>(JUMP_TO_LINE_EVENT, { detail }))
}
