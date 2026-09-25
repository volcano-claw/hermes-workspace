import { useMemo, useState } from 'react'
import catalog from '@/lib/catalog/repo-catalog.json'

type Repository = (typeof catalog.repositories)[number]

const decisionTone: Record<string, string> = {
  'Conserver critique': 'border-emerald-400/30 text-emerald-300',
  'Conserver stratégique': 'border-cyan-400/30 text-cyan-300',
  'À remettre à niveau': 'border-amber-400/30 text-amber-300',
  'À justifier ou supprimer': 'border-rose-400/30 text-rose-300',
}

export function RepositoriesScreen() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Tous')
  const [decision, setDecision] = useState('Tous')

  const decisions = useMemo(
    () => [...new Set(catalog.repositories.map((repo) => repo.decision))].sort(),
    [],
  )
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return catalog.repositories.filter((repo) => {
      if (category !== 'Tous' && repo.category !== category) return false
      if (decision !== 'Tous' && repo.decision !== decision) return false
      if (!needle) return true
      return [repo.name, repo.description, repo.purpose, repo.enables, repo.nextAction]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [category, decision, query])

  const counts = useMemo(() => {
    const privateCount = catalog.repositories.filter((repo) => repo.visibility === 'private').length
    const forks = catalog.repositories.filter((repo) => repo.fork).length
    const actionCount = catalog.repositories.filter((repo) =>
      /remettre|justifier|candidat|évaluer|auditer/i.test(repo.decision),
    ).length
    return { privateCount, forks, actionCount }
  }, [])

  return (
    <main className="min-h-full overflow-y-auto bg-[var(--theme-bg)] px-4 py-6 text-[var(--theme-text)] md:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-sm">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-400 via-cyan-400 to-transparent" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Gouvernance GitHub</p>
          <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">Tous les repos</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                La carte complète des repos accessibles à Volcano Claw : leur rôle exact, ce qu’ils nous permettent de construire et la prochaine décision utile.
              </p>
            </div>
            <span className="w-fit rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
              {catalog.coverage.repositories}/50 référencés
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Repos" value={catalog.coverage.repositories} />
            <Metric label="Catégories" value={catalog.categories.length} />
            <Metric label="Privés" value={counts.privateCount} />
            <Metric label="À décider" value={counts.actionCount} />
          </div>
          <p className="mt-3 text-xs text-muted">
            Source : installation GitHub <strong className="text-ink">{catalog.coverage.organization}</strong> · snapshot {catalog.generatedAt} · {counts.forks} forks.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_240px_240px]">
            <input
              aria-label="Rechercher un repo"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher par nom, rôle, capacité ou prochaine action…"
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2.5 text-sm text-ink outline-none focus:border-amber-400/60"
            />
            <select aria-label="Filtrer par catégorie" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2.5 text-sm text-ink">
              <option>Tous</option>
              {catalog.categories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select aria-label="Filtrer par décision" value={decision} onChange={(event) => setDecision(event.target.value)} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2.5 text-sm text-ink">
              <option>Tous</option>
              {decisions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <p className="mt-3 text-xs text-muted">{visible.length} repo{visible.length > 1 ? 's' : ''} affiché{visible.length > 1 ? 's' : ''}</p>
        </section>

        {catalog.categories.map((group) => {
          const repos = visible.filter((repo) => repo.category === group)
          if (repos.length === 0) return null
          return (
            <section key={group} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-ink">{group}</h2>
                <span className="rounded-full border border-[var(--theme-border)] px-2 py-0.5 text-xs text-muted">{repos.length}</span>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {repos.map((repo) => <RepositoryCard key={repo.fullName} repo={repo} />)}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-3"><div className="text-xl font-bold text-ink">{value}</div><div className="text-xs text-muted">{label}</div></div>
}

function RepositoryCard({ repo }: { repo: Repository }) {
  return (
    <article className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <a href={repo.url} target="_blank" rel="noreferrer" className="text-lg font-bold text-ink hover:text-amber-300">{repo.name}</a>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            <span>{repo.visibility}</span><span>·</span><span>{repo.language || 'multi'}</span>{repo.fork ? <><span>·</span><span>fork</span></> : null}
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${decisionTone[repo.decision] || 'border-[var(--theme-border)] text-muted'}`}>{repo.decision}</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{repo.description}</p>
      <dl className="mt-4 grid gap-3 text-sm">
        <Info label="Ce qu’il fait" value={repo.purpose} />
        <Info label="Ce qu’il nous permet" value={repo.enables} />
        <Info label="Prochaine décision" value={repo.nextAction} accent />
      </dl>
      {repo.parent ? <p className="mt-4 border-t border-[var(--theme-border)] pt-3 text-xs text-muted">Source amont : {repo.parent}</p> : null}
    </article>
  )
}

function Info({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt><dd className={`mt-1 leading-5 ${accent ? 'text-amber-300' : 'text-ink'}`}>{value}</dd></div>
}
