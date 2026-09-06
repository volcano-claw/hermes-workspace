import fs from 'node:fs'
import path from 'node:path'

export type WorkspaceOperatorCockpitStatus = {
  mode: 'workspace_operator_cockpit_status_v1'
  source: 'operatorapi_cockpit_status' | 'workspace_local_operator_health'
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
const DEFAULT_CONTEXT_ROOT = '/opt/data/hermes-context'

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

function readText(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

function statusFrom(text: string | null): string | null {
  if (!text) return null
  return text.match(/^Status:\s*\*\*([^*]+)\*\*/m)?.[1]?.trim() || null
}

function countOpenIncidents(text: string | null): number | null {
  if (!text) return null
  return text.split('\n').filter((line) => line.startsWith('- `open`')).length
}

function localOperatorHealthStatus(): WorkspaceOperatorCockpitStatus | null {
  const root = process.env.HERMES_CONTEXT_ROOT || DEFAULT_CONTEXT_ROOT
  const operatorHealth = readText(path.join(root, 'runtime', 'OPERATOR-HEALTH.md'))
  const cronHealth = readText(path.join(root, 'runtime', 'CRON-HEALTH.md'))
  const incidentIndex = readText(path.join(root, 'runtime', 'INCIDENT-INDEX.md'))
  const operatorStatus = statusFrom(operatorHealth)
  const cronStatus = statusFrom(cronHealth)
  if (!operatorStatus && !cronStatus) return null
  const openIncidents = countOpenIncidents(incidentIndex)
  const ok = operatorStatus === 'PASS' && cronStatus === 'PASS' && (openIncidents ?? 0) === 0
  return baseStatus({
    source: 'workspace_local_operator_health',
    reachable: true,
    ok,
    operatorStatus: ok ? 'PASS' : operatorStatus || 'ATTENTION',
    phaseClosureStatus: ok ? 'PASS' : operatorStatus || 'ATTENTION',
    localControlPlaneClosed: ok,
    openIncidents,
    goStopGates: 0,
    summary: ok
      ? 'Operator cockpit is functional from Workspace local health: Cron PASS, Operator health PASS, open incidents 0.'
      : 'Operator cockpit local health is reachable but still reports attention.',
  })
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
  const noOpenIncidents = (openIncidents ?? 0) === 0
  const noGoStopGates = (goStopGates ?? 0) === 0
  const clearOkState = ok && noOpenIncidents && noGoStopGates
  const displayOperatorStatus =
    clearOkState && operatorStatus?.toLowerCase() === 'attention'
      ? 'PASS'
      : operatorStatus
  const displayPhaseClosureStatus =
    clearOkState && phaseClosureStatus?.toLowerCase() === 'attention'
      ? 'PASS'
      : phaseClosureStatus

  const normalized = baseStatus({
    reachable: true,
    ok,
    operatorStatus: displayOperatorStatus,
    phaseClosureStatus: displayPhaseClosureStatus,
    localControlPlaneClosed: clearOkState || localControlPlaneClosed,
    openIncidents,
    goStopGates,
    summary: ok
      ? 'Operator cockpit status is reachable and reports OK.'
      : 'Operator cockpit status is reachable but reports attention.',
  })

  // local fork carry: the live OperatorAPI is deliberately isolated from
  // /opt/data/hermes-context, while Workspace mounts that truth read-only. If
  // OperatorAPI is reachable but reports stale missing local files, use the
  // local health files so the Operator tab reflects the real cockpit state.
  const local = localOperatorHealthStatus()
  if (normalized.operatorStatus?.toLowerCase() === 'attention' && local?.ok) {
    return local
  }
  return normalized
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
