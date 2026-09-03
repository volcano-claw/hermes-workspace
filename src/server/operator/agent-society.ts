export type OperatorAgentSocietyCell = {
  id: string
  displayName: string
  statusHint: string | null
}

export type WorkspaceOperatorAgentSociety = {
  mode: 'workspace_operator_agent_society_v1'
  reachable: boolean
  readOnly: true
  lanesTotal: number
  bindingsTotal: number
  inactiveLanesTotal: number
  peerEnabledLanes: number
  cellsTotal: number
  laneIds: Array<string>
  cells: Array<OperatorAgentSocietyCell>
  peerDispatchEnabled: false
  autonomousDispatchEnabled: false
  summary: string
  checkedAt: string
}

type FetchLike = typeof fetch

const MODE = 'workspace_operator_agent_society_v1' as const
const TOPOLOGY_ENDPOINT = '/api/operator/cockpit/agents/topology' as const
const CELLS_ENDPOINT = '/api/operator/memory/cells' as const
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

function readNumber(record: Record<string, unknown> | null, key: string): number {
  const value = record?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function readString(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readStringArray(record: Record<string, unknown> | null, key: string): Array<string> {
  const value = record?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function baseSociety(overrides: Partial<WorkspaceOperatorAgentSociety>): WorkspaceOperatorAgentSociety {
  return {
    mode: MODE,
    reachable: false,
    readOnly: true,
    lanesTotal: 0,
    bindingsTotal: 0,
    inactiveLanesTotal: 0,
    peerEnabledLanes: 0,
    cellsTotal: 0,
    laneIds: [],
    cells: [],
    summary: 'Operator agent society is not configured for Workspace.',
    checkedAt: nowIso(),
    ...overrides,
    peerDispatchEnabled: false,
    autonomousDispatchEnabled: false,
  }
}

async function fetchJson(fetchImpl: FetchLike, url: string): Promise<unknown> {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

function normalizeTopology(body: unknown) {
  const root = asRecord(body)
  const result = asRecord(root?.result) || root
  return {
    lanesTotal: readNumber(result, 'lanes_total'),
    bindingsTotal: readNumber(result, 'bindings_total'),
    inactiveLanesTotal: readNumber(result, 'inactive_lanes_total'),
    peerEnabledLanes: readNumber(result, 'peer_enabled_lanes'),
    laneIds: readStringArray(result, 'lane_ids'),
  }
}

function normalizeCells(body: unknown): Array<OperatorAgentSocietyCell> {
  const root = asRecord(body)
  const result = asRecord(root?.result) || root
  const data = asRecord(result?.data)
  const cells = data?.cells
  if (!Array.isArray(cells)) return []

  return cells
    .map((item) => {
      const record = asRecord(item)
      const id = readString(record, 'cell_id') || readString(record, 'id')
      const displayName = readString(record, 'display_name') || readString(record, 'displayName')
      if (!id || !displayName) return null
      return {
        id,
        displayName,
        statusHint: readString(record, 'status_hint') || readString(record, 'statusHint'),
      }
    })
    .filter((cell): cell is OperatorAgentSocietyCell => Boolean(cell))
}

export async function getOperatorAgentSociety(options?: {
  fetchImpl?: FetchLike
  operatorApiUrl?: string
}): Promise<WorkspaceOperatorAgentSociety> {
  const operatorApiUrl = normalizeBaseUrl(
    options?.operatorApiUrl ||
      process.env.HERMES_OPERATOR_API_URL ||
      process.env.OPERATOR_API_URL,
  )

  if (!operatorApiUrl) {
    return baseSociety({
      summary: 'Operator API URL is not configured for Workspace.',
    })
  }

  const fetchImpl = options?.fetchImpl || fetch

  try {
    const [topologyBody, cellsBody] = await Promise.all([
      fetchJson(fetchImpl, `${operatorApiUrl}${TOPOLOGY_ENDPOINT}`),
      fetchJson(fetchImpl, `${operatorApiUrl}${CELLS_ENDPOINT}`),
    ])
    const topology = normalizeTopology(topologyBody)
    const cells = normalizeCells(cellsBody)

    return baseSociety({
      reachable: true,
      ...topology,
      cells,
      cellsTotal: cells.length,
      summary: 'Operator agent society is visible in read-only mode.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return baseSociety({
      summary: `Operator agent society is unreachable: ${message}`,
    })
  }
}
