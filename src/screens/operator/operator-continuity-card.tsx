import type { WorkspaceOperatorContinuityStatus } from '@/server/operator/continuity-status'

export type OperatorContinuityConnectionStatus = {
  operatorContinuity?: WorkspaceOperatorContinuityStatus
}

function tone(status: WorkspaceOperatorContinuityStatus | undefined) {
  if (!status) {
    return {
      label: 'Unavailable',
      dot: 'bg-zinc-400',
      border: 'border-zinc-500/30',
      text: 'text-zinc-300',
    }
  }
  if (status.overallStatus === 'PASS') {
    return {
      label: 'PASS',
      dot: 'bg-emerald-400',
      border: 'border-emerald-400/30',
      text: 'text-emerald-300',
    }
  }
  return {
    label: 'ATTENTION',
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

function Lock({ label }: { label: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-black/10 px-2 py-1 text-[11px] text-muted dark:bg-white/5">
      <span>{label}</span>
      <span className="font-semibold text-emerald-300">locked</span>
    </li>
  )
}

export function OperatorContinuityCard({
  continuity,
}: {
  continuity: WorkspaceOperatorContinuityStatus | undefined
}) {
  const cardTone = tone(continuity)
  const healthFiles = continuity?.healthFiles.slice(0, 4) ?? []

  return (
    <section
      aria-label="Operator Continuity"
      className={`flex h-full flex-col rounded-xl border ${cardTone.border} bg-[var(--theme-card)] p-4 shadow-sm xl:col-span-2`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Operator Continuity
          </h3>
          <p className="mt-1 text-sm text-muted">
            Cron / watchdogs / mission health
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cardTone.border} ${cardTone.text}`}
        >
          <span className={`size-2 rounded-full ${cardTone.dot}`} />
          {cardTone.label}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Jobs" value={String(continuity?.scheduledJobs ?? 0)} />
        <Metric label="Cron last" value={continuity?.lastCronOk ? 'ok' : '—'} />
        <Metric
          label="Missions"
          value={String(continuity?.completedMissions ?? 0)}
        />
        <Metric
          label="Incidents"
          value={continuity?.openIncidents === null ? '—' : String(continuity?.openIncidents ?? 0)}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card2)] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Health files
          </div>
          <ul className="grid gap-1.5 md:grid-cols-3">
            {healthFiles.length ? (
              healthFiles.map((file) => (
                <li
                  key={file.id}
                  className="rounded-md bg-black/10 px-2 py-1 text-[11px] text-muted dark:bg-white/5"
                  title={file.path}
                >
                  <span className="font-semibold text-ink">{file.label}</span>
                  <span className="mx-1 text-muted">·</span>
                  <span>{file.status}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-muted">No health files visible.</li>
            )}
          </ul>
        </div>
        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card2)] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Guards
          </div>
          <ul className="space-y-1">
            <Lock label="No auto-restart" />
            <Lock label="No auto-write" />
            <Lock label="No deploy without GO" />
          </ul>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs text-muted">
        {continuity?.summary || 'Operator continuity is not available yet.'}
      </p>
    </section>
  )
}
