import { useMemo, useState } from 'react'
import { INSTRUCTION_REFERENCE } from '@/lib/mipsLanguage.ts'
import { cn } from './cn.ts'

interface RefEntry {
  mnemonic: string
  signature: string
  desc: string
}

const ALL_ENTRIES: RefEntry[] = Object.entries(INSTRUCTION_REFERENCE)
  .map(([mnemonic, ref]) => ({ mnemonic, signature: ref.signature, desc: ref.desc }))
  .sort((a, b) => a.mnemonic.localeCompare(b.mnemonic))

export function ReferencePanel() {
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return ALL_ENTRIES
    return ALL_ENTRIES.filter(
      (e) =>
        e.mnemonic.includes(q) ||
        e.signature.toLowerCase().includes(q) ||
        e.desc.toLowerCase().includes(q),
    )
  }, [filter])

  const selectedEntry =
    selected !== null ? ALL_ENTRIES.find((e) => e.mnemonic === selected) ?? null : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-7 flex-none items-center justify-between border-b border-divider px-3 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <span className="text-ink-2">Reference</span>
        <span className="text-ink-3">{filtered.length}/{ALL_ENTRIES.length}</span>
      </div>

      <div className="flex-none border-b border-divider px-2 py-1.5">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter mnemonics, signatures, descriptions…"
          aria-label="Filter instruction reference"
          className={cn(
            'w-full rounded-sm border border-divider bg-surface-2 px-2 py-1 font-mono text-[11px] text-ink-1',
            'placeholder:text-ink-3',
            'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent',
          )}
        />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ul className="flex-1 min-w-0 overflow-y-auto divide-y divide-divider/40">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-xs italic text-ink-3">No matches.</li>
          ) : (
            filtered.map((entry) => (
              <li key={entry.mnemonic}>
                <button
                  type="button"
                  onClick={() => setSelected(entry.mnemonic)}
                  className={cn(
                    'flex w-full items-baseline gap-2 px-3 py-1 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:bg-surface-2',
                    'hover:bg-surface-2',
                    selected === entry.mnemonic && 'bg-surface-3',
                  )}
                  title={entry.signature}
                >
                  <span className="flex-none font-mono text-[11px] font-semibold text-accent">
                    {entry.mnemonic}
                  </span>
                  <span className="flex-1 truncate font-mono text-[10px] text-ink-3">
                    {entry.signature}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {selectedEntry && (
        <div
          className="flex-none border-t border-divider px-3 py-2"
          aria-live="polite"
        >
          <div className="font-mono text-[11px] font-semibold text-accent">
            {selectedEntry.mnemonic}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-ink-2">
            {selectedEntry.signature}
          </div>
          <div className="mt-1 text-[11px] text-ink-2">{selectedEntry.desc}</div>
        </div>
      )}
    </div>
  )
}
