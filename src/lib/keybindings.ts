// Global keyboard shortcut layer. Each entry maps a normalized key
// signature (e.g., "Ctrl+S", "F5", "Shift+F7") to an action that pulls
// the latest store via getState() — the listener registers once and
// always sees fresh slice values without re-binding.
//
// Editor-specific bindings (Ctrl+F find, Ctrl+Z undo, Ctrl+/) are
// intentionally omitted — Monaco binds them itself and stops event
// propagation, so a window-level handler would never fire when the
// editor has focus. Browser-reserved combos (Ctrl+W, Ctrl+T,
// Ctrl+Shift+T) are also omitted because most browsers don't allow
// pages to override them.
//
// Ctrl+Shift+P (command palette) lives here too even though Shell
// already had a one-off handler — consolidating into one map keeps
// the registry inspectable from one place.

import { useSimulator } from '@/hooks/useSimulator.ts'
import { getEditorCursor } from './editorCursor.ts'
import { runEditorAction } from './editorActions.ts'

type Modifier = 'Ctrl' | 'Shift' | 'Alt'

function normalizeKey(event: KeyboardEvent): string {
  const parts: Modifier[] = []
  // macOS: treat Cmd the same as Ctrl. event.metaKey is the Cmd key.
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.altKey)   parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  // F-keys come through as event.key === 'F1'..'F12'. Letters arrive
  // as their case-sensitive form depending on Shift; lowercase here
  // for stable matching.
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
  return [...parts, key].join('+')
}

interface Binding {
  combo: string
  preventDefault: boolean
  run: () => void
}

function buildBindings(): Binding[] {
  return [
    // Assemble / runtime ops — F-keys don't collide with the browser.
    { combo: 'F3', preventDefault: true,  run: () => useSimulator.getState().assemble() },
    { combo: 'F5', preventDefault: true,  run: () => useSimulator.getState().run() },
    { combo: 'F6', preventDefault: true,  run: () => useSimulator.getState().pause() },
    { combo: 'F7', preventDefault: true,  run: () => useSimulator.getState().step() },
    { combo: 'Shift+F7', preventDefault: true, run: () => useSimulator.getState().backstep() },
    {
      combo: 'F8', preventDefault: true,
      run: () => {
        const line = getEditorCursor()
        if (typeof line === 'number') useSimulator.getState().runToCursor(line)
      },
    },
    {
      combo: 'F9', preventDefault: true,
      run: () => {
        const line = getEditorCursor()
        if (typeof line === 'number') useSimulator.getState().toggleBreakpoint(line)
      },
    },

    // File ops — preventDefault on the browser combos that overlap
    // (Ctrl+S = save page, Ctrl+O = open local file dialog,
    // Ctrl+N = new browser window — the latter is blocked on most
    // browsers but preventDefault is a no-op when so).
    { combo: 'Ctrl+N',       preventDefault: true, run: () => useSimulator.getState().newFile() },
    { combo: 'Ctrl+O',       preventDefault: true, run: () => { void useSimulator.getState().openFromDisk() } },
    { combo: 'Ctrl+S',       preventDefault: true, run: () => { void useSimulator.getState().saveActive() } },
    { combo: 'Ctrl+Shift+S', preventDefault: true, run: () => { void useSimulator.getState().saveActiveAs() } },

    // Layout toggles.
    { combo: 'Ctrl+B',     preventDefault: true, run: () => useSimulator.getState().toggleLeftRail()    },
    { combo: 'Ctrl+J',     preventDefault: true, run: () => useSimulator.getState().toggleBottomPanel() },
    { combo: 'Ctrl+Alt+B', preventDefault: true, run: () => useSimulator.getState().toggleRightPanel()  },

    // Settings + palette.
    { combo: 'Ctrl+,',       preventDefault: true, run: () => useSimulator.getState().openSettings() },
    { combo: 'Ctrl+Shift+P', preventDefault: true, run: () => useSimulator.getState().openCommandPalette() },

    // Phase 3 SA-9: editor actions that should work even when the
    // editor isn't focused. When the editor IS focused, Monaco
    // handles these natively and stops propagation, so these
    // bindings don't double-fire.
    { combo: 'Ctrl+G', preventDefault: true, run: () => runEditorAction('editor.action.gotoLine') },
    { combo: 'Ctrl+F', preventDefault: true, run: () => runEditorAction('actions.find') },
    { combo: 'Ctrl+H', preventDefault: true, run: () => runEditorAction('editor.action.startFindReplaceAction') },

    // Phase 3 SA-6: F1 opens the help dialog.
    { combo: 'F1', preventDefault: true, run: () => useSimulator.getState().openHelp() },
  ]
}

export function installKeybindings(): () => void {
  const bindings = buildBindings()
  function handler(event: KeyboardEvent): void {
    // If the user is typing in a plain <input> or <textarea>, only
    // intercept modifier-prefixed combos — bare keystrokes (including
    // F-keys) stay focused on the input. Monaco isn't covered here:
    // it manages its own keymap and stops propagation on bindings it
    // owns, so this handler doesn't even fire when those land.
    const target = event.target
    const isFormInput =
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    const hasModifier = event.ctrlKey || event.metaKey || event.altKey

    const combo = normalizeKey(event)
    for (const b of bindings) {
      if (b.combo !== combo) continue
      if (isFormInput && !hasModifier) return
      if (b.preventDefault) event.preventDefault()
      b.run()
      return
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}
