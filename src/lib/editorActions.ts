// Tiny holder for "trigger a Monaco action by ID without holding the
// editor instance directly". CodeEditor.tsx registers a runner on
// mount; the keybindings layer + menu items call runEditorAction()
// to dispatch built-in Monaco actions (find, replace, gotoLine, …)
// even when the editor is not the current focus owner.
//
// Phase 3 SA-9 introduced this for Ctrl+G + Edit/View menu wiring.

type ActionRunner = (actionId: string) => void

let runner: ActionRunner | null = null

export function setEditorActionRunner(fn: ActionRunner | null): void {
  runner = fn
}

export function runEditorAction(actionId: string): void {
  runner?.(actionId)
}
