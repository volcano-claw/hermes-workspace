import { describe, expect, it } from 'vitest'
import { getOperatorCockpitStatus } from './cockpit-status'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('operator cockpit status bridge', () => {
  it('degrades safely when no Operator API URL is configured', async () => {
    const status = await getOperatorCockpitStatus({ operatorApiUrl: '' })

    expect(status).toMatchObject({
      mode: 'workspace_operator_cockpit_status_v1',
      endpoint: '/api/operator/cockpit/status',
      reachable: false,
      ok: false,
      localControlPlaneClosed: false,
      openIncidents: null,
      goStopGates: null,
      writeActionsEnabled: false,
      deployAllowedWithoutGo: false,
      peerDispatchAllowedWithoutGo: false,
    })
    expect(status.summary).toContain('not configured')
  })

  it('normalizes current Operator API cockpit payload as read-only state', async () => {
    const calls: Array<string> = []
    const fetchImpl = ((url: string) => {
      calls.push(url)
      return Promise.resolve(jsonResponse({
        ok: true,
        result: {
          status: 'PASS',
          mode: 'operator_cockpit_readonly_bridge_v1',
          summary: {
            phase_closure: { status: 'PASS/PARTIAL' },
            component_summary: { go_stop_gates: 8 },
            readiness: {
              local_control_plane_closed: true,
              safe_for_public_deploy_without_go: false,
              safe_for_write_actions_without_go: false,
              safe_for_peer_dispatch_without_go: false,
            },
            risk_summary: { open_incidents: 0 },
          },
        },
      }))
    }) as unknown as typeof fetch

    const status = await getOperatorCockpitStatus({
      operatorApiUrl: 'http://operator-api.local:3000/',
      fetchImpl,
    })

    expect(calls).toEqual(['http://operator-api.local:3000/api/operator/cockpit/status'])
    expect(status).toMatchObject({
      reachable: true,
      ok: true,
      operatorStatus: 'PASS',
      phaseClosureStatus: 'PASS/PARTIAL',
      localControlPlaneClosed: true,
      openIncidents: 0,
      goStopGates: 8,
      writeActionsEnabled: false,
      deployAllowedWithoutGo: false,
      peerDispatchAllowedWithoutGo: false,
    })
    expect(status.summary).toContain('Operator cockpit status is reachable')
  })

  it('never enables write/deploy/peer actions from Operator payload flags', async () => {
    const fetchImpl = (() =>
      Promise.resolve(jsonResponse({
        ok: true,
        result: {
          status: 'PASS',
          summary: {
            readiness: {
              safe_for_public_deploy_without_go: true,
              safe_for_write_actions_without_go: true,
              safe_for_peer_dispatch_without_go: true,
            },
          },
        },
      }))) as unknown as typeof fetch

    const status = await getOperatorCockpitStatus({
      operatorApiUrl: 'http://operator-api.local:3000',
      fetchImpl,
    })

    expect(status.reachable).toBe(true)
    expect(status.writeActionsEnabled).toBe(false)
    expect(status.deployAllowedWithoutGo).toBe(false)
    expect(status.peerDispatchAllowedWithoutGo).toBe(false)
  })
})
