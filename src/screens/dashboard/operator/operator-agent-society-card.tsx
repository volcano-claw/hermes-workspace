import type { WorkspaceOperatorAgentSociety } from '@/server/operator/agent-society'

export type OperatorAgentSocietyConnectionStatus = {
  operatorAgentSociety?: WorkspaceOperatorAgentSociety
}

function tone(society: WorkspaceOperatorAgentSociety | undefined) {
  if (!society?.reachable) {
    return {
      label: 'Unavailable',
      dot: 'bg-zinc-400',
      border: 'border-zinc-500/30',
      text: 'text-zinc-300',
    }
  }
  return {
    label: 'Read-only',
    dot: 'bg-sky-400',
    border: 'border-sky-400/30',
    text: 'text-sky-300',
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card2)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-ink">{value}</div>
    </div>
  )
}

function Lock({ label }: { label: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-black/10 px-2 py-1 text-[11px] text-muted dark:bg-white/5">
      <span>{label}</span>
      <span className="font-semibold text-emerald-300">locked</span>
    </li>
  )
}

export function OperatorAgentSocietyCard({
  society,
}: {
  society: WorkspaceOperatorAgentSociety | undefined
}) {
  const cardTone = tone(society)
  const lanes = society?.laneIds.slice(0, 4) ?? []
  const cells = society?.cells.slice(0, 3) ?? []

  return (
    <section
      aria-label="Operator Agent Society"
      className={`flex h-full flex-col rounded-xl border ${cardTone.border} bg-[var(--theme-card)] p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Operator Agent Society
          </h3>
          <p className="mt-1 text-sm text-muted">
            Agents et cellules prévus par Operator, sans dispatch live.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cardTone.border} ${cardTone.text}`}
        >
          <span className={`size-2 rounded-full ${cardTone.dot}`} />
          {cardTone.label}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Lanes" value={String(society?.lanesTotal ?? 0)} />
        <Metric label="Bindings" value={String(society?.bindingsTotal ?? 0)} />
        <Metric label="Cells" value={String(society?.cellsTotal ?? 0)} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card2)] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Lanes
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(lanes.length ? lanes : ['—']).map((lane) => (
              <span
                key={lane}
                className="rounded-full border border-[var(--theme-border)] px-2 py-1 text-[11px] text-muted"
              >
                {lane}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card2)] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Cells
          </div>
          <ul className="space-y-1">
            {(cells.length ? cells : [{ id: 'none', displayName: '—', statusHint: null }]).map((cell) => (
              <li key={cell.id} className="truncate text-xs text-muted">
                {cell.displayName}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card2)] p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span className="text-muted">Dispatch</span>
          <span className="text-emerald-300">Read-only</span>
        </div>
        <ul className="space-y-1">
          <Lock label="Peer dispatch" />
          <Lock label="Autonomous dispatch" />
        </ul>
      </div>

      <p className="mt-3 line-clamp-2 text-xs text-muted">
        {society?.summary || 'Operator agent society is not reachable from Workspace yet.'}
      </p>
    </section>
  )
}
