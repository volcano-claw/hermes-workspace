type OperatorCockpitStatus = {
  reachable: boolean
  ok: boolean
  operatorStatus: string | null
  phaseClosureStatus: string | null
  localControlPlaneClosed: boolean
  openIncidents: number | null
  goStopGates: number | null
  writeActionsEnabled: false
  deployAllowedWithoutGo: false
  peerDispatchAllowedWithoutGo: false
  summary: string
}

export type OperatorCockpitConnectionStatus = {
  operatorCockpitStatus?: OperatorCockpitStatus
}

function statusTone(status: OperatorCockpitStatus | undefined) {
  if (!status?.reachable) {
    return {
      label: 'Unavailable',
      dot: 'bg-zinc-400',
      border: 'border-zinc-500/30',
      text: 'text-zinc-300',
    }
  }
  if (status.ok && status.operatorStatus !== 'attention') {
    return {
      label: status.operatorStatus || 'ok',
      dot: 'bg-emerald-400',
      border: 'border-emerald-400/30',
      text: 'text-emerald-300',
    }
  }
  return {
    label: status.operatorStatus || 'attention',
    dot: 'bg-amber-400',
    border: 'border-amber-400/30',
    text: 'text-amber-300',
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

function Guard({ label }: { label: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-black/10 px-2 py-1 text-[11px] text-muted dark:bg-white/5">
      <span>{label}</span>
      <span className="font-semibold text-emerald-300">locked</span>
    </li>
  )
}

export function OperatorCockpitCard({
  status,
}: {
  status: OperatorCockpitStatus | undefined
}) {
  const tone = statusTone(status)
  const phase = status?.phaseClosureStatus || '—'
  const incidents = status?.openIncidents ?? 0
  const gates = status?.goStopGates ?? 0

  return (
    <section
      aria-label="Operator Cockpit"
      className={`flex h-full flex-col rounded-xl border ${tone.border} bg-[var(--theme-card)] p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Operator Cockpit
          </h3>
          <p className="mt-1 text-sm text-muted">
            Pont live Workspace → Operator API, lecture seule.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone.border} ${tone.text}`}
        >
          <span className={`size-2 rounded-full ${tone.dot}`} />
          {tone.label}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric label="Phase" value={phase} />
        <Metric label="Incidents" value={String(incidents)} />
        <Metric label="GO/STOP" value={String(gates)} />
      </div>

      <div className="mt-4 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card2)] p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span className="text-muted">Gardes</span>
          <span className="text-emerald-300">Read-only</span>
        </div>
        <ul className="space-y-1">
          <Guard label="Write actions" />
          <Guard label="Deploy without GO" />
          <Guard label="Peer dispatch" />
        </ul>
      </div>

      <p className="mt-3 line-clamp-2 text-xs text-muted">
        {status?.summary || 'Operator API status is not reachable from Workspace yet.'}
      </p>
    </section>
  )
}
