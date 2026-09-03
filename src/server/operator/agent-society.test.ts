import { describe, expect, it } from 'vitest'
import { getOperatorAgentSociety } from './agent-society'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('operator agent society bridge', () => {
  it('degrades safely when no Operator API URL is configured', async () => {
    const society = await getOperatorAgentSociety({ operatorApiUrl: '' })

    expect(society).toMatchObject({
      mode: 'workspace_operator_agent_society_v1',
      reachable: false,
      readOnly: true,
      peerDispatchEnabled: false,
      autonomousDispatchEnabled: false,
      lanesTotal: 0,
      cellsTotal: 0,
    })
    expect(society.summary).toContain('not configured')
  })

  it('normalizes topology lanes and memory cells as read-only society state', async () => {
    const calls: Array<string> = []
    const fetchImpl = ((url: string) => {
      calls.push(url)
      if (url.endsWith('/api/operator/cockpit/agents/topology')) {
        return Promise.resolve(jsonResponse({
          ok: true,
          result: {
            status: 'attention',
            lanes_total: 8,
            bindings_total: 11,
            inactive_lanes_total: 0,
            peer_enabled_lanes: 0,
            autonomous_dispatch_gate_present: true,
            lane_ids: ['controller', 'builder', 'auditor'],
          },
        }))
      }
      return Promise.resolve(jsonResponse({
        ok: true,
        result: {
          data: {
            cells: [
              { cell_id: 'cell:operator-control-plane', display_name: 'Operator Control Plane', status_hint: 'healthy' },
              { cell_id: 'cell:openclaw-vps-main', display_name: 'OpenClaw VPS Main', status_hint: 'healthy' },
            ],
          },
        },
      }))
    }) as unknown as typeof fetch

    const society = await getOperatorAgentSociety({
      operatorApiUrl: 'http://operator-api.local:3000/',
      fetchImpl,
    })

    expect(calls).toEqual([
      'http://operator-api.local:3000/api/operator/cockpit/agents/topology',
      'http://operator-api.local:3000/api/operator/memory/cells',
    ])
    expect(society).toMatchObject({
      reachable: true,
      readOnly: true,
      peerDispatchEnabled: false,
      autonomousDispatchEnabled: false,
      lanesTotal: 8,
      bindingsTotal: 11,
      cellsTotal: 2,
      laneIds: ['controller', 'builder', 'auditor'],
    })
    expect(society.cells.map((cell) => cell.displayName)).toEqual([
      'Operator Control Plane',
      'OpenClaw VPS Main',
    ])
  })
})
