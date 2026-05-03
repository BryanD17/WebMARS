import { useState, type ReactNode } from 'react'
import { cn } from './cn.ts'
import { RegisterTable } from './RegisterTable.tsx'
import { MemoryEmpty } from './MemoryEmpty.tsx'

interface AccordionSectionProps {
  title: string
  defaultOpen?: boolean
  futureSubAgent?: string   // shown when the body is a placeholder
  children: ReactNode
}

function AccordionSection({
  title,
  defaultOpen = false,
  futureSubAgent,
  children,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const headerId = `right-panel-${title.toLowerCase().replace(/\s+/g, '-')}-header`
  const bodyId = `right-panel-${title.toLowerCase().replace(/\s+/g, '-')}-body`

  return (
    <section className="border-b border-divider">
      <h3 className="m-0">
        <button
          type="button"
          id={headerId}
          aria-controls={bodyId}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2 font-mono text-xs uppercase transition-colors',
            'focus-visible:outline-none focus-visible:bg-surface-2',
            'hover:bg-surface-2',
            open ? 'text-ink-1' : 'text-ink-2',
          )}
          style={{ letterSpacing: '0.06em' }}
        >
          <span aria-hidden="true" className="text-[10px] text-ink-3">
            {open ? '▾' : '▸'}
          </span>
          <span>{title}</span>
          {futureSubAgent && !open && (
            <span className="ml-auto text-[10px] normal-case text-ink-3" style={{ letterSpacing: '0' }}>
              {futureSubAgent}
            </span>
          )}
        </button>
      </h3>

      {open && (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={headerId}
          className="px-3 pb-3"
        >
          {children}
        </div>
      )}
    </section>
  )
}

function PlaceholderBody({ futureSubAgent, description }: { futureSubAgent: string; description: string }) {
  return (
    <div className="rounded-md border border-divider bg-surface-2 p-3 text-xs italic text-ink-3">
      <div>{description}</div>
      <div className="mt-1 font-mono text-[10px] text-ink-3" style={{ letterSpacing: '0.04em' }}>
        wired in {futureSubAgent}
      </div>
    </div>
  )
}

export function RightPanel() {
  return (
    <aside
      aria-label="Inspector panel"
      className="flex min-h-0 min-w-0 flex-col overflow-y-auto border-l border-divider bg-surface-1"
    >
      <AccordionSection title="Registers" defaultOpen>
        <RegisterTable />
      </AccordionSection>

      <AccordionSection title="Memory" futureSubAgent="SA-8">
        <MemoryEmpty />
      </AccordionSection>

      <AccordionSection title="Watches" futureSubAgent="SA-11">
        <PlaceholderBody
          futureSubAgent="SA-11"
          description="Track expressions across steps. Click + to add an expression."
        />
      </AccordionSection>

      <AccordionSection title="Call Stack" futureSubAgent="SA-11">
        <PlaceholderBody
          futureSubAgent="SA-11"
          description="Active jal/jr frames will appear here during execution."
        />
      </AccordionSection>
    </aside>
  )
}
