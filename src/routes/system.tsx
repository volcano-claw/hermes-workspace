import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { usePageTitle } from '@/hooks/use-page-title'
import type { SystemCockpitSnapshot, SystemConnectionStatus } from '@/server/system-cockpit'

async function fetchSystemCockpit(): Promise<SystemCockpitSnapshot> {
  const response = await fetch('/api/system-cockpit', { cache: 'no-store' })
  if (!response.ok) throw new Error(`system-cockpit ${response.status}`)
  return (await response.json()) as SystemCockpitSnapshot
}

function statusClass(status: SystemConnectionStatus): string {
  switch (status) {
    case 'PASS':
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
    case 'STOP':
      return 'border-red-400/30 bg-red-500/10 text-red-300'
    case 'ATTENTION':
      return 'border-amber-400/30 bg-amber-500/10 text-amber-300'
  }
}

function StatusBadge({ status }: { status: SystemConnectionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${statusClass(status)}`}>
      {status}
    </span>
  )
}

function ConnectionCard({ item }: { item: SystemCockpitSnapshot['connections'][number] }) {
  return (
    <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{item.label}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-3 break-words rounded-xl bg-black/10 p-3 font-mono text-xs text-muted dark:bg-white/5">
        {item.evidence}
      </p>
      {item.href ? (
        <a className="mt-3 inline-flex text-sm font-semibold text-[var(--theme-accent)] hover:underline" href={item.href}>
          Ouvrir
        </a>
      ) : null}
    </section>
  )
}

function BoundaryCard({ item }: { item: SystemCockpitSnapshot['boundaries'][number] }) {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{item.label}</div>
      <div className="mt-1 text-sm font-bold text-ink">{item.value}</div>
      <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
    </div>
  )
}

export const Route = createFileRoute('/system')({
  ssr: false,
  component: function SystemRoute() {
    usePageTitle('System')
    const query = useQuery({
      queryKey: ['system-cockpit'],
      queryFn: fetchSystemCockpit,
      refetchInterval: 30_000,
      retry: false,
    })
    const data = query.data

    return (
      <main className="min-h-full overflow-y-auto bg-[var(--theme-bg)] px-4 py-6 text-[var(--theme-text)] md:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
          <header className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-sm">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-400 via-amber-300 to-transparent" />
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Hermes Workspace</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink md:text-3xl">System Cockpit</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  Vérité de connexion: un Hermes central, plusieurs interfaces, garde-fous visibles. Lecture seule: pas de restart, pas de secrets, pas de Caddy/Docker sans GO.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="inline-flex w-fit rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm font-semibold text-ink hover:bg-[var(--theme-hover)]"
              >
                {query.isFetching ? 'Refresh…' : 'Refresh'}
              </button>
            </div>
          </header>

          {query.isError ? (
            <section className="rounded-xl border border-amber-400/30 bg-[var(--theme-card)] p-4 text-sm text-amber-300">
              System cockpit indisponible: {query.error.message}
            </section>
          ) : null}

          {data ? (
            <>
              <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted">Résumé</div>
                  <div className="mt-2 text-sm font-semibold leading-6 text-ink">{data.summary}</div>
                </div>
                <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted">Tasks</div>
                  <div className="mt-2 text-3xl font-black text-ink">{data.counts.tasks}</div>
                  <div className="mt-1 text-xs text-muted">{data.counts.tasksInProgress} en cours · {data.counts.tasksReview} review · {data.counts.tasksBlocked} bloquées</div>
                </div>
                <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted">Swarm</div>
                  <div className="mt-2 text-3xl font-black text-ink">{data.counts.swarmWorkers}</div>
                  <div className="mt-1 text-xs text-muted">profils agents détectés</div>
                </div>
                <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted">Identité</div>
                  <div className="mt-2 text-sm font-bold text-ink">Un Hermes</div>
                  <div className="mt-1 text-xs text-muted">plusieurs interfaces</div>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
                <h2 className="text-base font-semibold text-ink">Montages réels</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <p className="break-words font-mono text-xs text-muted">HERMES_HOME={data.identity.hermesHome}</p>
                  <p className="break-words font-mono text-xs text-muted">KNOWLEDGE_DIR={data.identity.knowledgeDir ?? 'unset'}</p>
                  <p className="break-words font-mono text-xs text-muted">TASKS_HOME={data.identity.tasksHome}</p>
                  <p className="break-words font-mono text-xs text-muted">HERMES_API_URL={data.identity.apiUrl}</p>
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
                <h2 className="text-base font-semibold text-ink">Niveaux de preuve de livraison</h2>
                <p className="mt-1 text-xs text-muted">Un processus vivant ne suffit plus : chaque niveau est vérifié séparément.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {data.proofLevels.map((level) => (
                    <div key={level.id} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-ink">{level.label}</div>
                        <StatusBadge status={level.status} />
                      </div>
                      <p className="mt-2 break-words font-mono text-[11px] leading-5 text-muted">{level.evidence}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {data.connections.map((item) => <ConnectionCard key={item.id} item={item} />)}
              </section>

              <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
                <h2 className="text-base font-semibold text-ink">Garde-fous</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {data.boundaries.map((item) => <BoundaryCard key={item.id} item={item} />)}
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-6 text-sm text-muted">Chargement du cockpit système…</section>
          )}
        </div>
      </main>
    )
  },
})
