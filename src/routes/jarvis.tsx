import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { usePageTitle } from '@/hooks/use-page-title'

type BridgeEntry = { name: string; kind: 'file' | 'directory' | 'other'; modifiedAt: string | null; size: number | null }
type CapabilityGroup = { group: string; items: Array<string> }
type CapabilitiesSnapshot = {
  checkedAt: string
  version: string
  channel: string
  update: string
  image: string
  runtime: { status: string; health: string; startedAt: string }
  fork: { image: string; sourceLabel: string; docs: string; enabledPlugins: number | null; totalPlugins: number | null; stockRoot: string; codexPlugin: string }
  modelsSummary: Array<string>
  memorySummary: Array<string>
  communicationSummary: Array<string>
  capabilities: Array<CapabilityGroup>
  limitations: Array<string>
}
type JarvisStatusResponse = {
  ok: boolean
  status: 'online' | 'degraded' | 'unavailable'
  checkedAt: string
  bridgeDir: string
  siblingCanonPath: string
  bridgeReadable: boolean
  siblingCanonReadable: boolean
  readOnly: boolean
  siblingCanonPreview: string
  inbox: Array<BridgeEntry>
  outbox: Array<BridgeEntry>
  capabilitiesSnapshot: CapabilitiesSnapshot | null
  error?: string
}

async function fetchJarvisStatus(): Promise<JarvisStatusResponse> {
  const response = await fetch('/api/jarvis')
  const payload = (await response.json()) as JarvisStatusResponse
  if (!response.ok) throw new Error(payload.error || 'Jarvis status unavailable')
  return payload
}

function StatusPill({ status }: { status: JarvisStatusResponse['status'] }) {
  const tone = status === 'online' ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30' : status === 'degraded' ? 'bg-amber-500/15 text-amber-300 ring-amber-400/30' : 'bg-red-500/15 text-red-300 ring-red-400/30'
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ring-1 ${tone}`}>{status}</span>
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div><div className="mt-2 text-2xl font-bold text-white">{value}</div>{detail ? <div className="mt-2 break-words text-xs text-slate-400">{detail}</div> : null}</div>
}

function BulletPanel({ title, items }: { title: string; items: Array<string> }) {
  return <section className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="text-sm font-semibold text-white">{title}</h3><ul className="mt-3 space-y-2 text-sm text-slate-300">{items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" /> <span>{item}</span></li>)}</ul></section>
}

function EntryList({ title, entries }: { title: string; entries: Array<BridgeEntry> }) {
  return <section className="rounded-2xl border border-white/10 bg-black/20 p-4"><h3 className="text-sm font-semibold text-white">{title}</h3><div className="mt-3 space-y-2">{entries.length ? entries.map((entry) => <div key={entry.name} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs">{entry.name}</span><span className="text-[11px] uppercase tracking-wide text-slate-400">{entry.kind}</span></div><div className="mt-1 text-xs text-slate-500">{entry.modifiedAt ? new Date(entry.modifiedAt).toLocaleString() : 'mtime unavailable'}{entry.size != null ? ` · ${entry.size} bytes` : ''}</div></div>) : <p className="text-sm text-slate-500">Aucun paquet récent.</p>}</div></section>
}

export const Route = createFileRoute('/jarvis')({
  ssr: false,
  component: function JarvisRoute() {
    usePageTitle('Jarvis')
    const { data, error, isLoading, refetch, isFetching } = useQuery({ queryKey: ['jarvis-status'], queryFn: fetchJarvisStatus, refetchInterval: 30_000 })
    const caps = data?.capabilitiesSnapshot
    const pluginCount = caps?.fork.enabledPlugins != null && caps.fork.totalPlugins != null ? `${caps.fork.enabledPlugins}/${caps.fork.totalPlugins}` : '—'

    return (
      <main className="min-h-full overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),linear-gradient(135deg,#020617,#0f172a_45%,#111827)] p-4 text-slate-100 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="rounded-3xl border border-emerald-400/20 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">Hermes ↔ Jarvis</p><h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">Jarvis panel</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Vue read-only du petit frère OpenClaw : version live, fork disponible, super-pouvoirs, contrat fraternel et derniers paquets typés.</p></div><div className="flex items-center gap-3">{data ? <StatusPill status={data.status} /> : <StatusPill status={isLoading ? 'degraded' : 'unavailable'} />}<button type="button" onClick={() => void refetch()} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15">{isFetching ? 'Refresh…' : 'Refresh'}</button></div></div>
          </header>

          {error ? <section className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">Jarvis non visible depuis le workspace : {error instanceof Error ? error.message : 'erreur inconnue'}</section> : null}

          <section className="grid gap-4 md:grid-cols-4">
            <InfoCard label="Version Jarvis" value={caps?.version.replace('OpenClaw ', '') || '…'} detail={caps?.update || 'lecture snapshot'} />
            <InfoCard label="Runtime" value={caps?.runtime.health || (data?.status ?? '…')} detail={caps?.image || 'OpenClaw image'} />
            <InfoCard label="Fork/plugins" value={pluginCount} detail={caps?.fork.codexPlugin || 'plugins disponibles'} />
            <InfoCard label="Protection" value={data?.readOnly ? 'Read-only' : isLoading ? '…' : 'Writable'} detail="Le workspace lit Jarvis sans pouvoir muter son état." />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <BulletPanel title="Disponible sur le fork" items={[`Image: ${caps?.fork.image || '—'}`, `Source label: ${caps?.fork.sourceLabel || '—'}`, `Stock plugins: ${caps?.fork.stockRoot || '—'}`, `Docs: ${caps?.fork.docs || '—'}`]} />
            <BulletPanel title="Modèles et auth" items={caps?.modelsSummary ?? ['Chargement…']} />
            <BulletPanel title="Mémoire" items={caps?.memorySummary ?? ['Chargement…']} />
          </section>

          <section className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-5">
            <h2 className="text-lg font-bold text-white">Synthèse des super-pouvoirs de Jarvis</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">{(caps?.capabilities ?? []).map((group) => <BulletPanel key={group.group} title={group.group} items={group.items} />)}</div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-5"><h2 className="text-lg font-bold text-white">Contrat visible</h2><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-sm leading-6 text-emerald-50">{data?.siblingCanonPreview || 'Chargement du contrat Jarvis/Hermes…'}</pre></section>
            <BulletPanel title="Limites/gardes" items={caps?.limitations ?? ['Actions dangereuses toujours GO Raphaël.']} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2"><EntryList title="Inbox Hermes → Jarvis" entries={data?.inbox ?? []} /><EntryList title="Outbox Jarvis → Hermes" entries={data?.outbox ?? []} /></section>
        </div>
      </main>
    )
  },
})
