export type WorkspaceOperatorCockpitStatus = {
  mode: 'workspace_operator_cockpit_status_v1'
  source: 'operatorapi_cockpit_status'
  endpoint: '/api/operator/cockpit/status'
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
  checkedAt: string
}

type FetchLike = typeof fetch

const MODE = 'workspace_operator_cockpit_status_v1' as const
const SOURCE = 'operatorapi_cockpit_status' as const
const ENDPOINT = '/api/operator/cockpit/status' as const
const TIMEOUT_MS = 3_000

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeBaseUrl(input: string | undefined): string {
  return (input || '').trim().replace(/\/+$/, '')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(record: Record<string, unknown> | null, key: string): number | null {
  if (!record) return null
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | null {
  if (!record) return null
  const value = record[key]
  return typeof value === 'boolean' ? value : null
}

function baseStatus(overrides: Partial<WorkspaceOperatorCockpitStatus>): WorkspaceOperatorCockpitStatus {
  return {
    mode: MODE,
    source: SOURCE,
    endpoint: ENDPOINT,
    reachable: false,
    ok: false,
    operatorStatus: null,
    phaseClosureStatus: null,
    localControlPlaneClosed: false,
    openIncidents: null,
    goStopGates: null,
    summary: 'Operator cockpit status is not configured for Workspace.',
    checkedAt: nowIso(),
    ...overrides,
    // Workspace must remain read-only even if a backend payload accidentally
    // exposes permissive flags. GO/STOP middleware is not implemented here.
    writeActionsEnabled: false,
    deployAllowedWithoutGo: false,
    peerDispatchAllowedWithoutGo: false,
  }
}

function normalizePayload(body: unknown): WorkspaceOperatorCockpitStatus {
  const root = asRecord(body)
  const result = asRecord(root?.result) || asRecord(root?.data) || root
  const summary = asRecord(result?.summary)
  const readiness = asRecord(summary?.readiness)
  const riskSummary = asRecord(summary?.risk_summary)
  const componentSummary = asRecord(summary?.component_summary)
  const phaseClosure = asRecord(summary?.phase_closure)

  const ok = readBoolean(root, 'ok') ?? readString(result, 'status') === 'PASS'
  const operatorStatus = readString(result, 'status')
  const phaseClosureStatus = readString(phaseClosure, 'status')
  const localControlPlaneClosed =
    readBoolean(readiness, 'local_control_plane_closed') ?? false
  const openIncidents = readNumber(riskSummary, 'open_incidents')
  const goStopGates = readNumber(componentSummary, 'go_stop_gates')

  return baseStatus({
    reachable: true,
    ok,
    operatorStatus,
    phaseClosureStatus,
    localControlPlaneClosed,
    openIncidents,
    goStopGates,
    summary: ok
      ? 'Operator cockpit status is reachable and reports OK.'
      : 'Operator cockpit status is reachable but reports attention.',
  })
}

export async function getOperatorCockpitStatus(options?: {
  fetchImpl?: FetchLike
  operatorApiUrl?: string
}): Promise<WorkspaceOperatorCockpitStatus> {
  const operatorApiUrl = normalizeBaseUrl(
    options?.operatorApiUrl ||
      process.env.HERMES_OPERATOR_API_URL ||
      process.env.OPERATOR_API_URL,
  )

  if (!operatorApiUrl) {
    return baseStatus({
      summary: 'Operator API URL is not configured for Workspace.',
    })
  }

  const fetchImpl = options?.fetchImpl || fetch
  const target = `${operatorApiUrl}${ENDPOINT}`

  try {
    const response = await fetchImpl(target, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!response.ok) {
      return baseStatus({
        reachable: true,
        summary: `Operator cockpit status returned HTTP ${response.status}.`,
      })
    }

    return normalizePayload(await response.json())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return baseStatus({
      summary: `Operator cockpit status is unreachable: ${message}`,
    })
  }
}
