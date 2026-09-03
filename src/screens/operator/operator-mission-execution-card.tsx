import type { WorkspaceOperatorMissionExecution } from '@/server/operator/mission-execution'

type Props = {
  missionExecution?: WorkspaceOperatorMissionExecution
}

const EMPTY_KANBAN = {
  link: '/tasks?assignee=operator' as const,
  total: 0,
  backlog: 0,
  todo: 0,
  inProgress: 0,
  review: 0,
  blocked: 0,
  done: 0,
}

export type OperatorMissionExecutionConnectionStatus = {
  operatorMissionExecution: WorkspaceOperatorMissionExecution
}

function statusColor(status?: string): string {
  if (status === 'PASS/PARTIAL') return 'text-emerald-300'
  if (status === 'ATTENTION') return 'text-amber-300'
  return 'text-muted'
}

export function OperatorMissionExecutionCard({ missionExecution }: Props) {
  const currentMission = missionExecution?.currentMission ?? null
  const kanban = missionExecution?.kanban ?? EMPTY_KANBAN
  const proofs = missionExecution?.proofs ?? ['Mission execution status is loading.']
  const nextGo = missionExecution?.nextGo ?? 'Mission execution status is loading.'
  const status = missionExecution?.overallStatus ?? 'ATTENTION'

  return (
    <section
      aria-label="Operator Mission Execution"
      className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Operator Mission Execution
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              Mission → Kanban → Proof
            </h2>
            <p className="mt-1 text-xs text-muted">
              Mission lisible, reliée au Kanban, sans action automatique.
            </p>
          </div>
          <span className={`text-xs font-semibold uppercase ${statusColor(status)}`}>
            {status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-hover)]/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Kanban</p>
            <p className="mt-1 text-xl font-semibold text-ink">{kanban.total}</p>
          </div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-hover)]/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Running</p>
            <p className="mt-1 text-xl font-semibold text-ink">{kanban.inProgress}</p>
          </div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-hover)]/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Review</p>
            <p className="mt-1 text-xl font-semibold text-ink">{kanban.review}</p>
          </div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-hover)]/40 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Blocked</p>
            <p className="mt-1 text-xl font-semibold text-ink">{kanban.blocked}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Current mission
          </p>
          {currentMission ? (
            <div className="mt-2 space-y-1 text-sm">
              <p className="font-semibold text-ink">{currentMission.title}</p>
              {currentMission.businessArea ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                  {currentMission.businessArea} real work
                </p>
              ) : null}
              {currentMission.objective ? (
                <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-hover)]/30 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Objectif
                  </p>
                  <p className="mt-1 text-xs text-ink">{currentMission.objective}</p>
                </div>
              ) : (
                <p className="text-xs text-muted">{currentMission.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.08em] text-muted">
                <span>{currentMission.status}</span>
                <span>{currentMission.priority}</span>
                <span>{currentMission.assignee ?? 'unassigned'}</span>
              </div>
              {currentMission.proofReportPath || currentMission.sourceReportPath ? (
                <div className="space-y-1 text-[11px] text-muted">
                  {currentMission.proofReportPath ? (
                    <p>Proof report: {currentMission.proofReportPath}</p>
                  ) : null}
                  {currentMission.sourceReportPath ? (
                    <p>Source report: {currentMission.sourceReportPath}</p>
                  ) : null}
                </div>
              ) : null}
              {currentMission.nextHumanGo ? (
                <p className="text-xs font-semibold text-amber-300">
                  Prochain GO humain: {currentMission.nextHumanGo}
                </p>
              ) : null}
              {currentMission.actionSurface ? (
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
                    Anti-doublon
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Operator pilote; le vrai cockpit DBM exécute.
                  </p>
                  <a
                    href={currentMission.actionSurface.href}
                    className="mt-2 inline-flex rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/10"
                  >
                    {currentMission.actionSurface.label}
                  </a>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-amber-300">
              Aucune mission Operator active trouvée dans le Kanban.
            </p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Proofs
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {proofs.map((proof) => (
                <li key={proof}>• {proof}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Next GO
            </p>
            <p className="mt-2 text-xs text-muted">{nextGo}</p>
            <a
              href={kanban.link}
              className="mt-3 inline-flex rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[var(--theme-hover)]"
            >
              Open Kanban
            </a>
          </div>
        </div>

        <div className="grid gap-2 text-xs text-muted md:grid-cols-2">
          <div className="rounded-lg border border-emerald-400/20 p-2">
            Execution controls <span className="text-emerald-300">locked</span>
          </div>
          <div className="rounded-lg border border-emerald-400/20 p-2">
            Write route <span className="text-emerald-300">locked</span>
          </div>
          {currentMission?.externalActionReadOnly ? (
            <div className="rounded-lg border border-amber-400/20 p-2 md:col-span-2">
              External action <span className="text-amber-300">manual / GO-gated</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
