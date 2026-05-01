// Empty-state for the Memory tab. The preview block mimics the real
// MARS memory dump format (address + 4 bytes + ASCII column) so when
// Day 3 wires the actual inspector, students recognize the layout.

const PREVIEW_ROWS: ReadonlyArray<{ addr: string; bytes: string; ascii: string }> = [
  { addr: '0x10010000', bytes: '00 00 00 00', ascii: '....' },
  { addr: '0x10010004', bytes: '00 00 00 00', ascii: '....' },
  { addr: '0x10010008', bytes: '00 00 00 00', ascii: '....' },
  { addr: '0x1001000c', bytes: '00 00 00 00', ascii: '....' },
]

export function MemoryEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg text-ink-2">
        Memory inspector wires in on Day 3.
      </p>

      <div className="flex flex-col items-center gap-2">
        <span
          className="rounded-pill border border-divider bg-surface-2 px-2 py-0.5 font-mono text-xs uppercase text-ink-3"
          style={{ letterSpacing: '0.08em' }}
        >
          Preview
        </span>
        <pre
          aria-hidden="true"
          className="rounded-md border border-divider bg-surface-elev p-3 font-mono text-sm italic text-ink-3"
        >
          {PREVIEW_ROWS.map(
            (r) => `${r.addr}  ${r.bytes}  ${r.ascii}\n`,
          ).join('')}
        </pre>
      </div>
    </div>
  )
}
