import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GitHubFleetAudit, GitHubFleetRepository, FleetState } from '@/server/github-fleet'

const stateLabel: Record<FleetState, string> = {
  upstream_review: 'Amont à auditer',
  decision_due: 'Décision attendue',
  stale_review: 'Rôle à confirmer',
  archive_review: 'Archive à décider',
  needs_evidence: 'Preuve manquante',
  current: 'À jour',
}

const stateTone: Record<FleetState, string> = {
  upstream_review: 'border-amber-400/40 text-amber-300',
  decision_due: 'border-rose-400/40 text-rose-300',
  stale_review: 'border-orange-400/40 text-orange-300',
  archive_review: 'border-violet-400/40 text-violet-300',
  needs_evidence: 'border-rose-400/40 text-rose-300',
  current: 'border-emerald-400/30 text-emerald-300',
}

const bucketLabel = {
  prendre_vite: 'À prendre vite',
  utile_bientot: 'Utile bientôt',
  confort: 'Confort / laboratoire',
  ignorer: 'Référence / ignorer',
} as const

async function fetchFleet(): Promise<GitHubFleetAudit> {
  const response = await fetch('/api/github-fleet', { cache: 'no-store' })
  if (!response.ok) throw new Error(`GitHub fleet audit unavailable (${response.status})`)
  return response.json() as Promise<GitHubFleetAudit>
}

function formatDate(value: string | null) {
  if (!value) return 'inconnue'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function RepositoriesScreen() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Tous')
  const [state, setState] = useState<'Tous' | FleetState>('Tous')
  const fleetQuery = useQuery({ queryKey: ['github-fleet'], queryFn: fetchFleet, refetchInterval: 5 * 60_000 })
  const fleet = fleetQuery.data
  const repositories = fleet?.repositories ?? []
  const categories = useMemo(() => [...new Set(repositories.map((repo) => repo.category))].sort(), [repositories])
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return repositories.filter((repo) => {
      if (category !== 'Tous' && repo.category !== category) return false
      if (state !== 'Tous' && repo.audit.state !== state) return false
      if (!needle) return true
      return [repo.name, repo.fullName, repo.purpose, repo.enables, repo.audit.reason, repo.audit.recommendedAction, repo.qualitativeReview?.verdict, repo.qualitativeReview?.nextAction]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [category, query, repositories, state])

  return (
    <main className="min-h-full overflow-y-auto bg-[var(--theme-bg)] px-4 py-6 text-[var(--theme-text)] md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-sm">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400 via-cyan-400 to-transparent" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Cockpit d’évolution GitHub</p>
          <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">50 repos sous surveillance</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">Comparatif vivant des forks et produits : activité, dérive amont, utilité, risque et prochaine action pour faire évoluer Hermes sans fusion aveugle.</p>
            </div>
            <button type="button" onClick={() => fleetQuery.refetch()} disabled={fleetQuery.isFetching} className="w-fit rounded-xl border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-300 disabled:opacity-50">
              {fleetQuery.isFetching ? 'Actualisation…' : 'Relire le dernier audit'}
            </button>
          </div>
          {fleet ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                <Metric label="Audités" value={`${fleet.coverage.audited}/${fleet.coverage.expected}`} />
                <Metric label="Amont à auditer" value={fleet.summary.behindUpstream} />
                <Metric label="À jour" value={fleet.summary.states.current ?? 0} />
                <Metric label="Erreurs" value={fleet.coverage.errors} />
                <Metric label="Privés" value={fleet.summary.private} />
              </div>
              <p className="mt-3 text-xs text-muted">Dernier audit GitHub : <strong className="text-ink">{formatDate(fleet.generatedAt)}</strong> · {fleet.summary.forks} forks · {fleet.summary.qualitativelyReviewed ?? 0} décisions qualitatives · preuve complète : {fleet.coverage.complete ? 'oui' : 'non'}.</p>
            </>
          ) : null}
        </header>

        {fleetQuery.isError ? <section className="rounded-2xl border border-rose-400/40 bg-[var(--theme-card)] p-5 text-sm text-rose-300">{fleetQuery.error instanceof Error ? fleetQuery.error.message : 'Audit indisponible'}</section> : null}
        {fleetQuery.isLoading ? <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 text-sm text-muted">Chargement du comparatif réel des 50 repos…</section> : null}

        {fleet ? (
          <>
            <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_240px_240px]">
                <input aria-label="Rechercher un repo" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, rôle, risque ou prochaine action…" className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2.5 text-sm text-ink outline-none focus:border-amber-400/60" />
                <select aria-label="Filtrer par catégorie" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2.5 text-sm text-ink"><option>Tous</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
                <select aria-label="Filtrer par état" value={state} onChange={(event) => setState(event.target.value as 'Tous' | FleetState)} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2.5 text-sm text-ink"><option>Tous</option>{Object.entries(stateLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </div>
              <p className="mt-3 text-xs text-muted">{visible.length} repo{visible.length > 1 ? 's' : ''} affiché{visible.length > 1 ? 's' : ''}, triés par priorité réelle.</p>
            </section>
            <section className="grid gap-4 xl:grid-cols-2">
              {visible.map((repo) => <RepositoryCard key={repo.fullName} repo={repo} />)}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-3"><div className="text-xl font-bold text-ink">{value}</div><div className="text-xs text-muted">{label}</div></div>
}

function RepositoryCard({ repo }: { repo: GitHubFleetRepository }) {
  return (
    <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><a href={repo.url} target="_blank" rel="noreferrer" className="text-lg font-bold text-ink hover:text-amber-300">{repo.name}</a><div className="mt-1 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"><span>{repo.visibility}</span><span>·</span><span>{repo.language || 'multi'}</span>{repo.fork ? <><span>·</span><span>fork</span></> : null}</div></div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stateTone[repo.audit.state]}`}>{stateLabel[repo.audit.state]}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><MiniMetric label="Retard amont" value={repo.behindBy ?? '—'} /><MiniMetric label="Avance fork" value={repo.aheadBy ?? '—'} /><MiniMetric label="Dernier push" value={repo.ageDays == null ? '—' : `${repo.ageDays} j`} /></div>
      <dl className="mt-4 grid gap-3 text-sm"><Info label="Rôle" value={repo.purpose} /><Info label="Apport potentiel" value={repo.enables} /><Info label="Diagnostic" value={repo.audit.reason} />{repo.qualitativeReview ? <><Info label="Décision qualitative" value={`${bucketLabel[repo.qualitativeReview.bucket]} — ${repo.qualitativeReview.verdict}`} /><Info label="Risque licence / intégration" value={repo.qualitativeReview.licenseRisk} /><Info label="Prochaine action vérifiée" value={repo.qualitativeReview.nextAction} accent /></> : <Info label="Prochaine action" value={repo.audit.recommendedAction} accent />}</dl>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--theme-border)] pt-3 text-xs text-muted"><span>Priorité {repo.audit.priority}/100</span><span>Push {formatDate(repo.pushedAt)}</span>{repo.license ? <span>Licence {repo.license}</span> : null}{repo.parent ? <span>Amont {repo.parent}</span> : null}</div>
    </article>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg bg-[var(--theme-bg)] px-2 py-2"><div className="font-bold text-ink">{value}</div><div className="mt-0.5 text-[10px] text-muted">{label}</div></div> }
function Info({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt><dd className={`mt-1 leading-5 ${accent ? 'text-amber-300' : 'text-ink'}`}>{value}</dd></div> }
