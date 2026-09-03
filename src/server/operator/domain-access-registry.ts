export type OperatorDomainAccessStatus =
  | 'LIVE'
  | 'AUTH_PROTECTED'
  | 'DEGRADED'
  | 'TLS_ERROR'
  | 'RESERVED'
  | 'INVENTORY_NEEDED'

export type OperatorDomainAccessEntry = {
  id: string
  label: string
  url: string
  role: string
  project: 'Hermes' | 'Operator' | 'OpenClaw' | 'Volcano' | 'DBM' | 'PaperClip'
  status: OperatorDomainAccessStatus
  accessModel: 'public' | 'authenticated' | 'api' | 'protected' | 'reserved'
  evidence: string
  actionLabel: string
  actionHref: string
  goGate: string
}

export type WorkspaceOperatorDomainAccessRegistry = {
  mode: 'workspace_operator_domain_access_registry_v1'
  readOnly: true
  secretsExposed: false
  registryPath: string
  checkedAt: string
  summary: string
  counts: Record<OperatorDomainAccessStatus, number>
  entries: Array<OperatorDomainAccessEntry>
}

const REGISTRY_PATH = '/opt/data/hermes-context/DOMAIN-API-ACCESS-REGISTRY.md'

const ENTRIES: Array<OperatorDomainAccessEntry> = [
  {
    id: 'hermes-workspace',
    label: 'Hermes Workspace',
    url: 'https://hermes.heiries.fr/',
    role: 'Surface humaine active: Workspace, Operator, missions, preuves, GO.',
    project: 'Hermes',
    status: 'LIVE',
    accessModel: 'authenticated',
    evidence: 'HTTP 200 on 2026-09-02; /operator live verified.',
    actionLabel: 'Ouvrir Hermes Workspace',
    actionHref: 'https://hermes.heiries.fr/operator',
    goGate: 'Workspace recreate/push/provider/secrets require explicit GO.',
  },
  {
    id: 'preview-hub',
    label: 'Preview Hub',
    url: 'https://preview.heiries.fr/',
    role: 'Hub central partagé pour previews, sorties projet, assets et runs.',
    project: 'Operator',
    status: 'LIVE',
    accessModel: 'public',
    evidence: 'HTTP 200 on 2026-09-02.',
    actionLabel: 'Ouvrir Preview Hub',
    actionHref: 'https://preview.heiries.fr/',
    goGate: 'Publication/new preview routing require explicit GO.',
  },
  {
    id: 'operator-heiries',
    label: 'Operator Heiries',
    url: 'https://operator.heiries.fr/',
    role: 'Surface future pour actions Operator, approvals et workflows.',
    project: 'Operator',
    status: 'TLS_ERROR',
    accessModel: 'authenticated',
    evidence: 'TLSV1_ALERT_INTERNAL_ERROR from VPS probe on 2026-09-02.',
    actionLabel: 'Réparer TLS/routage Operator',
    actionHref: 'https://operator.heiries.fr/',
    goGate: 'DNS/TLS/reverse-proxy change requires explicit GO.',
  },
  {
    id: 'dashboard-heiries',
    label: 'Dashboard Heiries',
    url: 'https://dashboard.heiries.fr/',
    role: 'Dashboard transverse futur: projets, APIs, agents, Kanban, GO, preuves.',
    project: 'Operator',
    status: 'TLS_ERROR',
    accessModel: 'authenticated',
    evidence: 'TLSV1_ALERT_INTERNAL_ERROR from VPS probe on 2026-09-02.',
    actionLabel: 'Décider/réparer Dashboard',
    actionHref: 'https://dashboard.heiries.fr/',
    goGate: 'DNS/TLS/reverse-proxy/auth policy require explicit GO.',
  },
  {
    id: 'api-heiries-volcano-mobile',
    label: 'Volcano Mobile API',
    url: 'https://api.heiries.fr/volcano-mobile',
    role: 'API gateway Volcano Mobile / Volcano OS.',
    project: 'Volcano',
    status: 'DEGRADED',
    accessModel: 'api',
    evidence: '/healthz and /v1/mobile/status returned HTTP 502 on 2026-09-02.',
    actionLabel: 'Auditer API Volcano Mobile',
    actionHref: 'https://api.heiries.fr/volcano-mobile/v1/mobile/status',
    goGate: 'API route repair/deploy/restart requires explicit GO.',
  },
  {
    id: 'openclaw-heiries',
    label: 'OpenClaw Heiries',
    url: 'https://openclaw.heiries.fr/',
    role: 'Surface dédiée OpenClaw réservée.',
    project: 'OpenClaw',
    status: 'TLS_ERROR',
    accessModel: 'authenticated',
    evidence: 'TLSV1_ALERT_INTERNAL_ERROR from VPS probe on 2026-09-02.',
    actionLabel: 'Auditer OpenClaw public route',
    actionHref: 'https://openclaw.heiries.fr/',
    goGate: 'Exposure/routing changes require explicit GO.',
  },
  {
    id: 'paperclip-heiries',
    label: 'PaperClip Heiries',
    url: 'https://paperclip.heiries.fr/',
    role: 'Surface PaperClip spécialisée/réservée.',
    project: 'PaperClip',
    status: 'DEGRADED',
    accessModel: 'protected',
    evidence: 'HTTP 502 from VPS probe on 2026-09-02.',
    actionLabel: 'Auditer PaperClip route',
    actionHref: 'https://paperclip.heiries.fr/',
    goGate: 'PaperClip runtime/reverse-proxy changes require explicit GO.',
  },
  {
    id: 'volcano-fund',
    label: 'Volcano Fund',
    url: 'https://volcanofund.heiries.fr/',
    role: 'AI hedge-fund UI protégée.',
    project: 'Volcano',
    status: 'AUTH_PROTECTED',
    accessModel: 'protected',
    evidence: 'HTTP 401 on 2026-09-02; protected surface expected.',
    actionLabel: 'Ouvrir Volcano Fund',
    actionHref: 'https://volcanofund.heiries.fr/',
    goGate: 'Credentials stay outside Workspace; deploy/runtime changes require explicit GO.',
  },
  {
    id: 'dbm-saas',
    label: 'DBM public SaaS',
    url: 'https://www.directbookingmanager.com/saas',
    role: 'Domaine canonique public Direct Booking Manager.',
    project: 'DBM',
    status: 'LIVE',
    accessModel: 'public',
    evidence: 'HTTP 200 on 2026-09-02.',
    actionLabel: 'Ouvrir DBM public',
    actionHref: 'https://www.directbookingmanager.com/saas',
    goGate: 'DBM prod changes require explicit GO.',
  },
  {
    id: 'dbm-cockpit',
    label: 'DBM Cockpit',
    url: 'https://cockpit.directbookingmanager.com/login',
    role: 'Vraie surface métier DBM: Workspace, Super Admin, Outreach, Pipeline.',
    project: 'DBM',
    status: 'LIVE',
    accessModel: 'authenticated',
    evidence: 'HTTP 200 on /login and /outreach redirects to login on 2026-09-02.',
    actionLabel: 'Ouvrir DBM Cockpit',
    actionHref: 'https://cockpit.directbookingmanager.com/login',
    goGate: 'DBM writes/email/Sender/AgentMail/Stripe require explicit GO.',
  },
  {
    id: 'dbm-fr',
    label: 'DBM France redirect',
    url: 'https://directbookingmanager.fr/',
    role: 'Domaine FR redirigé/canonicalisé vers le .com.',
    project: 'DBM',
    status: 'LIVE',
    accessModel: 'public',
    evidence: 'HTTP 200 final URL https://www.directbookingmanager.com/saas on 2026-09-02.',
    actionLabel: 'Ouvrir DBM FR',
    actionHref: 'https://directbookingmanager.fr/',
    goGate: 'DNS/Vercel/canonical changes require explicit GO.',
  },
  {
    id: 'dbm-specialized-domains',
    label: 'DBM specialized domains',
    url: 'https://www.directbookingmanager.com/saas',
    role: 'app/edl/fortress/tenant/status domains found in docs; require dedicated audit.',
    project: 'DBM',
    status: 'INVENTORY_NEEDED',
    accessModel: 'reserved',
    evidence: 'Found in DBM docs/tools; not all were probed in this pass.',
    actionLabel: 'Voir DBM canonique',
    actionHref: 'https://www.directbookingmanager.com/saas',
    goGate: 'Run DBM-specific domain audit before any change.',
  },
]

function countByStatus(entries: Array<OperatorDomainAccessEntry>) {
  const counts = {
    LIVE: 0,
    AUTH_PROTECTED: 0,
    DEGRADED: 0,
    TLS_ERROR: 0,
    RESERVED: 0,
    INVENTORY_NEEDED: 0,
  } satisfies Record<OperatorDomainAccessStatus, number>

  for (const entry of entries) counts[entry.status] += 1
  return counts
}

export function getOperatorDomainAccessRegistry(): WorkspaceOperatorDomainAccessRegistry {
  return {
    mode: 'workspace_operator_domain_access_registry_v1',
    readOnly: true,
    secretsExposed: false,
    registryPath: REGISTRY_PATH,
    checkedAt: new Date().toISOString(),
    summary: 'Domaines/API maison inventoriés sans secrets; les accès sont des liens et GO gates, pas des credentials.',
    counts: countByStatus(ENTRIES),
    entries: ENTRIES,
  }
}
