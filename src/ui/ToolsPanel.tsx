import { useSimulator } from '@/hooks/useSimulator.ts'

// Phase 3 follow-up: wires the rail's Tools icon. Mirrors the
// Tools menu bar entries as a clickable list so users who keep the
// rail expanded can launch tools without going up to the menu.

interface ToolEntry {
  label: string
  description: string
  onClick: () => void
}

export function ToolsPanel() {
  const openTool          = useSimulator((s) => s.openTool)
  const openPlaceholder   = useSimulator((s) => s.openPlaceholderTool)
  const toggleMagnifier   = useSimulator((s) => s.toggleScreenMagnifier)

  const real: ToolEntry[] = [
    { label: 'Instruction Counter',           description: 'Static + runtime mnemonic histogram', onClick: () => openTool('instructionCounter') },
    { label: 'Bitmap Display',                description: 'Treats memory as a 2D pixel grid',     onClick: () => openTool('bitmap') },
    { label: 'Keyboard / Display MMIO',       description: 'Memory-mapped I/O at 0xffff0000',     onClick: () => openTool('mmio') },
    { label: 'Floating-Point Representation', description: 'IEEE 754 bit-level editor',            onClick: () => openTool('fpRepr') },
    { label: 'Memory Reference Visualization',description: 'Top-50 access bar chart',              onClick: () => openTool('memRef') },
    { label: 'Screen Magnifier',              description: 'Floating loupe for projector demos',   onClick: toggleMagnifier },
  ]

  const placeholders: ToolEntry[] = [
    { label: 'Data Cache Simulator',  description: 'v2.0', onClick: () => openPlaceholder('Data Cache Simulator') },
    { label: 'MIPS X-Ray',            description: 'v2.0', onClick: () => openPlaceholder('MIPS X-Ray') },
    { label: 'BHT Simulator',         description: 'v2.0', onClick: () => openPlaceholder('BHT Simulator') },
    { label: 'Digital Lab Sim',       description: 'v2.0', onClick: () => openPlaceholder('Digital Lab Sim') },
    { label: 'Scavenger Hunt',        description: 'v2.0', onClick: () => openPlaceholder('Scavenger Hunt') },
    { label: 'Mars Bot',              description: 'v2.0', onClick: () => openPlaceholder('Mars Bot') },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-7 flex-none items-center justify-between border-b border-divider px-3 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        <span className="text-ink-2">Tools</span>
        <span className="text-ink-3">{real.length} + {placeholders.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Section title="Available" entries={real} />
        <Section title="Coming in v2.0" entries={placeholders} muted />
      </div>
    </div>
  )
}

function Section({ title, entries, muted }: { title: string; entries: ToolEntry[]; muted?: boolean }) {
  return (
    <section>
      <header
        className="sticky top-0 z-10 border-b border-divider/60 bg-surface-1 px-3 py-1 font-mono text-[10px] uppercase text-ink-3"
        style={{ letterSpacing: '0.06em' }}
      >
        {title}
      </header>
      <ul className="divide-y divide-divider/40">
        {entries.map((entry) => (
          <li key={entry.label}>
            <button
              type="button"
              onClick={entry.onClick}
              className="block w-full px-3 py-1.5 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2"
            >
              <div className={'text-[11px] ' + (muted ? 'text-ink-2' : 'text-ink-1')}>{entry.label}</div>
              <div className="font-mono text-[10px] text-ink-3" style={{ letterSpacing: '0.04em' }}>
                {entry.description}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
