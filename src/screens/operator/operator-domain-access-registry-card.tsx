import type { WorkspaceOperatorDomainAccessRegistry } from '@/server/operator/domain-access-registry'

type Props = {
  registry?: WorkspaceOperatorDomainAccessRegistry
}

export type OperatorDomainAccessRegistryConnectionStatus = {
  operatorDomainAccessRegistry: WorkspaceOperatorDomainAccessRegistry
}

const STATUS_CLASS: Record<string, string> = {
  LIVE: 'text-emerald-300',
  AUTH_PROTECTED: 'text-sky-300',
  DEGRADED: 'text-amber-300',
  TLS_ERROR: 'text-red-300',
  RESERVED: 'text-muted',
  INVENTORY_NEEDED: 'text-amber-200',
}

export function OperatorDomainAccessRegistryCard({ registry }: Props) {
  const entries = registry?.entries ?? []
  const counts = registry?.counts

  return (
    <section
      aria-label="Operator Domain/API Access Registry"
      className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 shadow-sm xl:col-span-2"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Operator Access Registry
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              Domaines, API et accès maison
            </h2>
            <p className="mt-1 max-w-3xl text-xs text-muted">
              Registre intelligent sans secrets: liens, rôles, statuts, preuves et GO gates. Les credentials restent hors Workspace.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400" />
            No secrets
          </div>
        </div>

        {counts ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            {Object.entries(counts).map(([status, total]) => (
              <div key={status} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-hover)]/40 p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{status}</p>
                <p className={`mt-1 text-xl font-semibold ${STATUS_CLASS[status] ?? 'text-ink'}`}>{total}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Règle d’accès
          </p>
          <p className="mt-2 text-xs text-muted">
            Hermes Workspace affiche les accès utiles, mais jamais les mots de passe, tokens, clés API, secrets DNS/OAuth ou connection strings.
          </p>
          {registry?.registryPath ? (
            <p className="mt-2 text-[11px] text-muted">Canon: {registry.registryPath}</p>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{entry.label}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-muted">
                    {entry.project} · {entry.accessModel}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold uppercase ${STATUS_CLASS[entry.status] ?? 'text-muted'}`}>
                  {entry.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{entry.role}</p>
              <p className="mt-2 text-[11px] text-muted">Proof: {entry.evidence}</p>
              <p className="mt-2 text-[11px] text-amber-300">GO gate: {entry.goGate}</p>
              <a
                href={entry.actionHref}
                className="mt-3 inline-flex rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[var(--theme-hover)]"
              >
                {entry.actionLabel}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
