// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OperatorScreen } from './operator-screen'

function renderOperatorScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <OperatorScreen />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('OperatorScreen', () => {
  it('renders a dedicated read-only Operator page with cockpit and agent society panels', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            operatorCockpitStatus: {
              reachable: true,
              ok: true,
              operatorStatus: 'ok',
              phaseClosureStatus: 'PASS/PARTIAL',
              localControlPlaneClosed: true,
              openIncidents: 0,
              goStopGates: 8,
              writeActionsEnabled: false,
              deployAllowedWithoutGo: false,
              peerDispatchAllowedWithoutGo: false,
              summary: 'Operator cockpit status is reachable and reports OK.',
            },
            operatorAgentSociety: {
              mode: 'workspace_operator_agent_society_v1',
              reachable: true,
              readOnly: true,
              lanesTotal: 8,
              bindingsTotal: 11,
              inactiveLanesTotal: 0,
              peerEnabledLanes: 0,
              cellsTotal: 2,
              laneIds: ['controller', 'auditor', 'builder_codex', 'research_scout'],
              cells: [
                {
                  id: 'cell:openclaw-vps-main',
                  displayName: 'OpenClaw VPS Main',
                  statusHint: 'healthy',
                },
                {
                  id: 'cell:operator-control-plane',
                  displayName: 'Operator Control Plane',
                  statusHint: 'healthy',
                },
              ],
              peerDispatchEnabled: false,
              autonomousDispatchEnabled: false,
              summary: 'Operator agent society is visible in read-only mode.',
              checkedAt: '2026-09-02T00:00:00.000Z',
            },
            operatorContinuity: {
              mode: 'workspace_operator_continuity_v1',
              readOnly: true,
              overallStatus: 'PASS',
              cronStatus: 'PASS',
              missionStatus: 'PASS',
              operatorHealthStatus: 'PASS',
              scheduledJobs: 11,
              lastCronOk: true,
              openIncidents: 0,
              completedMissions: 33,
              healthFiles: [
                { id: 'cron', label: 'Cron', status: 'PASS', path: '/opt/data/hermes-context/runtime/CRON-HEALTH.md', exists: true, updated: '2026-09-02T10:39:37+00:00' },
              ],
              summary: 'Cron PASS, Mission Control PASS, Operator health PASS.',
            },
            operatorMissionExecution: {
              mode: 'workspace_operator_mission_execution_v1',
              readOnly: true,
              overallStatus: 'PASS/PARTIAL',
              executionEnabled: false,
              writeRouteEnabled: false,
              checkedAt: '2026-09-02T11:30:00.000Z',
              currentMission: {
                id: 'operator-mission-1',
                title: 'Operator Mission Execution v1',
                description: 'Build a readable mission card.',
                status: 'in_progress',
                priority: 'high',
                assignee: 'operator',
                updatedAt: '2026-09-02T11:00:00.000Z',
              },
              kanban: {
                link: '/tasks?assignee=operator',
                total: 1,
                backlog: 0,
                todo: 0,
                inProgress: 1,
                review: 0,
                blocked: 0,
                done: 0,
              },
              proofs: ['Kanban task operator-mission-1 is in_progress', 'No write route enabled'],
              nextGo: 'GO Workspace live recreate Operator Mission Execution v1 — recréer seulement hermes-workspace avec rollback, vérifier /operator mission panel, no push',
              summary: 'Operator mission is visible and linked to Kanban.',
            },
            operatorDomainAccessRegistry: {
              mode: 'workspace_operator_domain_access_registry_v1',
              readOnly: true,
              secretsExposed: false,
              registryPath: '/opt/data/hermes-context/DOMAIN-API-ACCESS-REGISTRY.md',
              checkedAt: '2026-09-02T12:00:00.000Z',
              summary: 'Domaines/API maison inventoriés sans secrets.',
              counts: {
                LIVE: 2,
                AUTH_PROTECTED: 0,
                DEGRADED: 1,
                TLS_ERROR: 1,
                RESERVED: 0,
                INVENTORY_NEEDED: 0,
              },
              entries: [
                {
                  id: 'hermes-workspace',
                  label: 'Hermes Workspace',
                  url: 'https://hermes.heiries.fr/',
                  role: 'Surface humaine active: Workspace, Operator, missions, preuves, GO.',
                  project: 'Hermes',
                  status: 'LIVE',
                  accessModel: 'authenticated',
                  evidence: 'HTTP 200 on 2026-09-02.',
                  actionLabel: 'Ouvrir Hermes Workspace',
                  actionHref: 'https://hermes.heiries.fr/operator',
                  goGate: 'Workspace recreate/push/provider/secrets require explicit GO.',
                },
              ],
            },
          }),
        ),
      ),
    )

    renderOperatorScreen()

    expect(screen.getByRole('heading', { name: 'Operator' })).toBeTruthy()
    expect(screen.getByText('Cockpit Operator maison, lecture seule.')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Operator Cockpit' })).toBeTruthy()
      expect(screen.getByRole('region', { name: 'Operator Agent Society' })).toBeTruthy()
      expect(screen.getByRole('region', { name: 'Operator Continuity' })).toBeTruthy()
      expect(screen.getByRole('region', { name: 'Operator Mission Execution' })).toBeTruthy()
      expect(screen.getByRole('region', { name: 'Operator Domain/API Access Registry' })).toBeTruthy()
      expect(screen.getByText('Domaines, API et accès maison')).toBeTruthy()
      expect(screen.getByText('Hermes Workspace')).toBeTruthy()
      expect(screen.getAllByText('PASS/PARTIAL').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('controller')).toBeTruthy()
      expect(screen.getByText('builder_codex')).toBeTruthy()
      expect(screen.getByText('OpenClaw VPS Main')).toBeTruthy()
      expect(screen.getAllByText('locked').length).toBeGreaterThanOrEqual(5)
    })
  })
})
