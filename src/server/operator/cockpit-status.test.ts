import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getOperatorCockpitStatus } from './cockpit-status'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('operator cockpit status bridge', () => {
  const temporaryRoots: Array<string> = []
  const originalHermesTokenFile =
    process.env.HERMES_OPERATOR_UCP_BEARER_TOKEN_FILE
  const originalUcpTokenFile = process.env.UCP_BEARER_TOKEN_FILE

  afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true })
    }
    if (originalHermesTokenFile === undefined) {
      delete process.env.HERMES_OPERATOR_UCP_BEARER_TOKEN_FILE
    } else {
      process.env.HERMES_OPERATOR_UCP_BEARER_TOKEN_FILE =
        originalHermesTokenFile
    }
    if (originalUcpTokenFile === undefined) {
      delete process.env.UCP_BEARER_TOKEN_FILE
    } else {
      process.env.UCP_BEARER_TOKEN_FILE = originalUcpTokenFile
    }
  })

  function tokenFile(token: string): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-ucp-token-'))
    temporaryRoots.push(root)
    const filePath = path.join(root, 'bearer-token')
    fs.writeFileSync(filePath, `${token}\n`, { mode: 0o600 })
    return filePath
  }

  it('degrades safely when no Operator API URL is configured', async () => {
    const status = await getOperatorCockpitStatus({ operatorApiUrl: '' })

    expect(status).toMatchObject({
      mode: 'workspace_operator_cockpit_status_v1',
      source: 'unconfigured',
      endpoint: null,
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

  it.each([
    'HERMES_OPERATOR_UCP_BEARER_TOKEN_FILE',
    'UCP_BEARER_TOKEN_FILE',
  ] as const)(
    'uses authenticated UCP health and capabilities from server-side %s',
    async (tokenFileEnvironmentVariable) => {
      const secret = 'workspace-only-secret'
      const calls: Array<{ url: string; init?: RequestInit }> = []
      const fetchImpl = ((url: string, init?: RequestInit) => {
        calls.push({ url, init })
        if (url.endsWith('/control/v1/health')) {
          return Promise.resolve(
            jsonResponse({
              status: 'pass',
              mode: 'read_only',
              owner_observed: true,
              artifact: 'operator-control-api',
              api_version: 'v1',
            }),
          )
        }
        if (url.endsWith('/control/v1/capabilities')) {
          return Promise.resolve(
            jsonResponse({
              api_version: 'v1',
              server_id: 'operator-control-api',
              operations: [
                { operation: 'health.read', risk_class: 'read' },
                { operation: 'capabilities.read', risk_class: 'read' },
              ],
            }),
          )
        }
        throw new Error(`unexpected legacy request: ${url}`)
      }) as unknown as typeof fetch

      delete process.env.HERMES_OPERATOR_UCP_BEARER_TOKEN_FILE
      delete process.env.UCP_BEARER_TOKEN_FILE
      process.env[tokenFileEnvironmentVariable] = tokenFile(secret)
      const status = await getOperatorCockpitStatus({
        operatorApiUrl: 'http://operator-api.local:3000/',
        fetchImpl,
      })

      expect(calls.map(({ url }) => url)).toEqual([
        'http://operator-api.local:3000/control/v1/health',
        'http://operator-api.local:3000/control/v1/capabilities',
      ])
      for (const { init } of calls) {
        expect(init?.headers).toMatchObject({
          Accept: 'application/json',
          Authorization: `Bearer ${secret}`,
        })
      }
      expect(status).toMatchObject({
        source: 'operator_ucp_v1',
        endpoint: '/control/v1/health + /control/v1/capabilities',
        reachable: true,
        ok: true,
        operatorStatus: 'PASS',
        phaseClosureStatus: null,
        localControlPlaneClosed: true,
        openIncidents: null,
        goStopGates: null,
        writeActionsEnabled: false,
        deployAllowedWithoutGo: false,
        peerDispatchAllowedWithoutGo: false,
      })
      expect(status.summary).toContain(
        'Operator UCP operator-control-api is reachable',
      )
      expect(JSON.stringify(status)).not.toContain(secret)
      expect(status).not.toHaveProperty('authorization')
      expect(status).not.toHaveProperty('token')
    },
  )

  it('falls back to the legacy compatibility route when UCP is unavailable', async () => {
    const calls: Array<string> = []
    const fetchImpl = ((url: string) => {
      calls.push(url)
      if (url.includes('/control/v1/')) {
        return Promise.resolve(
          jsonResponse({ error: 'unavailable' }, { status: 503 }),
        )
      }
      return Promise.resolve(
        jsonResponse({
          ok: true,
          result: {
            status: 'PASS',
            summary: {
              phase_closure: { status: 'PASS/PARTIAL' },
              component_summary: { go_stop_gates: 8 },
              readiness: { local_control_plane_closed: true },
              risk_summary: { open_incidents: 0 },
            },
          },
        }),
      )
    }) as unknown as typeof fetch

    const status = await getOperatorCockpitStatus({
      operatorApiUrl: 'http://operator-api.local:3000',
      fetchImpl,
      ucpBearerTokenFile: tokenFile('fallback-secret'),
    })

    expect(calls).toEqual([
      'http://operator-api.local:3000/control/v1/health',
      'http://operator-api.local:3000/control/v1/capabilities',
      'http://operator-api.local:3000/api/operator/cockpit/status',
    ])
    expect(status).toMatchObject({
      source: 'operatorapi_cockpit_status',
      endpoint: '/api/operator/cockpit/status',
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
  })

  it('uses the legacy fallback when the UCP bearer is misconfigured', async () => {
    const calls: Array<string> = []
    const fetchImpl = ((url: string) => {
      calls.push(url)
      return Promise.resolve(
        jsonResponse({
          ok: true,
          result: {
            status: 'PASS',
            summary: {
              phase_closure: { status: 'PASS' },
              component_summary: { go_stop_gates: 0 },
              readiness: { local_control_plane_closed: true },
              risk_summary: { open_incidents: 0 },
            },
          },
        }),
      )
    }) as unknown as typeof fetch

    const status = await getOperatorCockpitStatus({
      operatorApiUrl: 'http://operator-api.local:3000',
      fetchImpl,
      ucpBearerTokenFile: '/missing/ucp-token',
    })

    expect(calls).toEqual([
      'http://operator-api.local:3000/api/operator/cockpit/status',
    ])
    expect(status).toMatchObject({
      source: 'operatorapi_cockpit_status',
      endpoint: '/api/operator/cockpit/status',
      reachable: true,
      ok: true,
      operatorStatus: 'PASS',
      phaseClosureStatus: 'PASS',
      localControlPlaneClosed: true,
      openIncidents: 0,
      goStopGates: 0,
    })
  })
})
