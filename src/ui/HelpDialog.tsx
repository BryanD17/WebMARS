import { useEffect, useMemo, useRef, useState } from 'react'
import { useSimulator } from '@/hooks/useSimulator.ts'
import {
  INSTRUCTION_ENTRIES,
  DIRECTIVE_ENTRIES,
  SYSCALL_ENTRIES,
  EXCEPTION_ENTRIES,
  type InstructionEntry,
} from '@/lib/instructionReference.ts'
import { REPO_URL, ISSUES_URL } from '@/lib/constants.ts'
import { cn } from './cn.ts'

export type HelpTab = 'basic' | 'pseudo' | 'directives' | 'syscalls' | 'exceptions' | 'about'

const TABS: ReadonlyArray<{ id: HelpTab; label: string }> = [
  { id: 'basic',      label: 'Basic Instructions' },
  { id: 'pseudo',     label: 'Pseudo-Instructions' },
  { id: 'directives', label: 'Directives' },
  { id: 'syscalls',   label: 'Syscalls' },
  { id: 'exceptions', label: 'Exceptions' },
  { id: 'about',      label: 'About' },
]

const BASIC_CATEGORIES = new Set(['arithmetic','logical','shift','memory','branch','jump','multiply-divide','comparison','syscall','fpu','trap'])

function FilterInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={cn(
        'w-full rounded-sm border border-divider bg-surface-2 px-2 py-1 font-mono text-[11px] text-ink-1',
        'placeholder:text-ink-3 focus-visible:outline-none focus-visible:border-accent',
      )}
    />
  )
}

function InstructionTable({ entries, filter }: { entries: ReadonlyArray<InstructionEntry>; filter: string }) {
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.mnemonic.includes(q) ||
        e.format.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.includes(q),
    )
  }, [entries, filter])

  return (
    <table className="w-full border-collapse text-[11px]">
      <thead className="sticky top-0 bg-surface-1">
        <tr className="border-b border-divider font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>
          <th className="px-2 py-1 text-left w-32">Mnemonic</th>
          <th className="px-2 py-1 text-left">Format</th>
          <th className="px-2 py-1 text-left">Description</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((e) => (
          <tr key={e.mnemonic} className="border-b border-divider/40">
            <td className="px-2 py-1 font-mono text-accent">{e.mnemonic}</td>
            <td className="px-2 py-1 font-mono text-ink-2">{e.format}</td>
            <td className="px-2 py-1 text-ink-2">{e.description}</td>
          </tr>
        ))}
        {filtered.length === 0 && (
          <tr><td colSpan={3} className="px-2 py-3 text-center italic text-ink-3">No matches.</td></tr>
        )}
      </tbody>
    </table>
  )
}

export function HelpDialog() {
  const open      = useSimulator((s) => s.helpDialogOpen)
  const closeHelp = useSimulator((s) => s.closeHelp)
  const tab       = useSimulator((s) => s.helpDialogTab)
  const setTab    = useSimulator((s) => s.setHelpTab)

  const [filter, setFilter] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeHelp()
    }
    window.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, closeHelp])

  if (!open) return null

  const basicEntries  = INSTRUCTION_ENTRIES.filter((e) => e.category !== 'pseudo' && BASIC_CATEGORIES.has(e.category))
  const pseudoEntries = INSTRUCTION_ENTRIES.filter((e) => e.category === 'pseudo')

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeHelp() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Help"
        tabIndex={-1}
        className={cn(
          'flex h-[44rem] w-[60rem] flex-col overflow-hidden rounded-lg border border-divider bg-surface-1 shadow-xl',
          'focus-visible:outline-none',
        )}
      >
        <header className="flex h-10 flex-none items-center justify-between border-b border-divider px-4">
          <div className="flex items-center gap-2 text-sm text-ink-1">
            <span aria-hidden="true">?</span>
            Help
          </div>
          <button
            type="button"
            onClick={closeHelp}
            aria-label="Close help"
            title="Close (Esc)"
            className="rounded-sm px-2 py-0.5 text-base text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            ×
          </button>
        </header>

        <div className="flex flex-1 min-h-0">
          <nav aria-label="Help tabs" className="flex w-48 flex-none flex-col border-r border-divider bg-surface-2 py-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => { setTab(t.id); setFilter('') }}
                className={cn(
                  'flex h-8 items-center px-4 text-left text-xs transition-colors',
                  'focus-visible:outline-none focus-visible:bg-surface-3',
                  tab === t.id ? 'bg-surface-3 text-ink-1' : 'text-ink-2 hover:bg-surface-3 hover:text-ink-1',
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
            {tab !== 'about' && (
              <div className="flex-none border-b border-divider px-4 py-2">
                <FilterInput value={filter} onChange={setFilter} placeholder={`Filter ${tab}…`} />
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {tab === 'basic' && <InstructionTable entries={basicEntries}  filter={filter} />}
              {tab === 'pseudo' && <InstructionTable entries={pseudoEntries} filter={filter} />}

              {tab === 'directives' && (
                <table className="w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-surface-1">
                    <tr className="border-b border-divider font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>
                      <th className="px-2 py-1 text-left w-32">Directive</th>
                      <th className="px-2 py-1 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIRECTIVE_ENTRIES
                      .filter((d) => !filter || d.name.includes(filter.toLowerCase()) || d.description.toLowerCase().includes(filter.toLowerCase()))
                      .map((d) => (
                        <tr key={d.name} className="border-b border-divider/40">
                          <td className="px-2 py-1 font-mono text-accent">{d.name}</td>
                          <td className="px-2 py-1 text-ink-2">{d.description}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {tab === 'syscalls' && (
                <table className="w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-surface-1">
                    <tr className="border-b border-divider font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>
                      <th className="px-2 py-1 text-right w-12">Code</th>
                      <th className="px-2 py-1 text-left w-32">Name</th>
                      <th className="px-2 py-1 text-left">Arguments</th>
                      <th className="px-2 py-1 text-left">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYSCALL_ENTRIES
                      .filter((s) => !filter || s.name.includes(filter.toLowerCase()) || String(s.code).includes(filter))
                      .map((s) => (
                        <tr key={s.code} className="border-b border-divider/40">
                          <td className="px-2 py-1 text-right font-mono tabular-nums text-accent">{s.code}</td>
                          <td className="px-2 py-1 font-mono text-ink-1">{s.name}</td>
                          <td className="px-2 py-1 text-ink-2">{s.args}</td>
                          <td className="px-2 py-1 text-ink-2">{s.result}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {tab === 'exceptions' && (
                <table className="w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-surface-1">
                    <tr className="border-b border-divider font-mono text-[10px] uppercase text-ink-3" style={{ letterSpacing: '0.06em' }}>
                      <th className="px-2 py-1 text-left w-40">Exception</th>
                      <th className="px-2 py-1 text-left">Cause</th>
                      <th className="px-2 py-1 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXCEPTION_ENTRIES
                      .filter((x) => !filter || x.name.toLowerCase().includes(filter.toLowerCase()) || x.cause.toLowerCase().includes(filter.toLowerCase()))
                      .map((x) => (
                        <tr key={x.name} className="border-b border-divider/40">
                          <td className="px-2 py-1 font-mono text-accent">{x.name}</td>
                          <td className="px-2 py-1 text-ink-2">{x.cause}</td>
                          <td className="px-2 py-1 text-[10px] text-ink-3">{x.notes}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {tab === 'about' && (
                <div className="prose-sm flex flex-col gap-3 text-xs text-ink-2">
                  <h2 className="text-base text-ink-1">WebMARS</h2>
                  <p>A modern, browser-based MIPS Assembler and Runtime Simulator. Built as a final project for a computer architecture course over a six-day sprint.</p>
                  <p>WebMARS is inspired by, and built as a tribute to, the original MARS simulator developed by Pete Sanderson and Kenneth Vollmar at Missouri State University. We are not affiliated with the original project. Their work has supported MIPS assembly education for over two decades.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Source: <a className="text-accent hover:underline" href={REPO_URL} target="_blank" rel="noopener noreferrer">{REPO_URL}</a></li>
                    <li>Issues: <a className="text-accent hover:underline" href={ISSUES_URL} target="_blank" rel="noopener noreferrer">{ISSUES_URL}</a></li>
                    <li>License: MIT</li>
                  </ul>
                  <h3 className="mt-2 text-sm text-ink-1">Team</h3>
                  <p>Bryan Djenabia (UI, integration, deployment), Landon Clay (assembler and parser), Zachary Gass (simulator and execution).</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex h-10 flex-none items-center justify-end border-t border-divider bg-surface-1 px-4">
          <button
            type="button"
            onClick={closeHelp}
            className="rounded-sm bg-surface-2 px-3 py-1 text-xs text-ink-1 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
