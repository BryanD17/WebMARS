// Phase 4 SA-4: honest proof bar. The original spec called for
// university adoption logos; we don't have any, so the section is
// instead three real numbers from the project itself.

const STATS = [
  { value: '125+', label: 'Tests passing' },
  { value: '50+',  label: 'MIPS instructions' },
  { value: '6',    label: 'Tools built-in' },
] as const

export function ProofBar() {
  return (
    <section
      aria-label="Project stats"
      className="landing-reveal py-12"
      style={{ background: 'var(--l-bg-alt)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-8 px-6 sm:flex-row sm:items-center sm:justify-around sm:divide-x" style={{ borderColor: 'var(--l-border)' }}>
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="flex flex-col items-center text-center"
            style={i > 0 ? { borderColor: 'var(--l-border)' } : undefined}
          >
            <span className="text-4xl font-bold md:text-[36px]" style={{ color: 'var(--l-accent)' }}>
              {stat.value}
            </span>
            <span className="mt-2 text-sm font-medium" style={{ color: 'var(--l-ink-2)' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
