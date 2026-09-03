import { useQuery } from '@tanstack/react-query'
import { OperatorContinuityCard } from './operator-continuity-card'
import { OperatorDomainAccessRegistryCard } from './operator-domain-access-registry-card'
import { OperatorMissionExecutionCard } from './operator-mission-execution-card'
import type { OperatorAgentSocietyConnectionStatus } from '@/screens/dashboard/operator/operator-agent-society-card'
import type { OperatorCockpitConnectionStatus } from '@/screens/dashboard/operator/operator-cockpit-card'
import type { OperatorContinuityConnectionStatus } from './operator-continuity-card'
import type { OperatorDomainAccessRegistryConnectionStatus } from './operator-domain-access-registry-card'
import type { OperatorMissionExecutionConnectionStatus } from './operator-mission-execution-card'
import { OperatorCockpitCard } from '@/screens/dashboard/operator/operator-cockpit-card'
import { OperatorAgentSocietyCard } from '@/screens/dashboard/operator/operator-agent-society-card'

type OperatorConnectionStatus = OperatorCockpitConnectionStatus &
  OperatorAgentSocietyConnectionStatus &
  OperatorContinuityConnectionStatus &
  OperatorMissionExecutionConnectionStatus &
  OperatorDomainAccessRegistryConnectionStatus

async function fetchOperatorConnectionStatus(): Promise<OperatorConnectionStatus> {
  const response = await fetch('/api/connection-status', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`connection-status ${response.status}`)
  }
  return (await response.json()) as OperatorConnectionStatus
}

export function OperatorScreen() {
  const query = useQuery<OperatorConnectionStatus>({
    queryKey: ['operator', 'connection-status'],
    queryFn: fetchOperatorConnectionStatus,
    staleTime: 5_000,
    refetchInterval: 30_000,
    retry: false,
  })

  const cockpit = query.data?.operatorCockpitStatus
  const society = query.data?.operatorAgentSociety
  const continuity = query.data?.operatorContinuity
  const missionExecution = query.data?.operatorMissionExecution
  const domainAccessRegistry = query.data?.operatorDomainAccessRegistry

  return (
    <main className="min-h-full overflow-y-auto bg-[var(--theme-bg)] px-4 py-6 text-[var(--theme-text)] md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
            style={{
              background:
                'linear-gradient(90deg, var(--theme-accent), var(--theme-accent-secondary), transparent)',
            }}
          />
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Workspace Operator
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">
                Operator
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Cockpit Operator maison, lecture seule.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-400" />
              Read-only
            </div>
          </div>
        </header>

        {query.isError ? (
          <section className="rounded-xl border border-amber-400/30 bg-[var(--theme-card)] p-4 text-sm text-amber-300">
            Operator indisponible depuis Workspace: {query.error.message}
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <OperatorCockpitCard status={cockpit} />
          <OperatorAgentSocietyCard society={society} />
          <OperatorContinuityCard continuity={continuity} />
          <OperatorMissionExecutionCard missionExecution={missionExecution} />
          <OperatorDomainAccessRegistryCard registry={domainAccessRegistry} />
        </section>
      </div>
    </main>
  )
}
