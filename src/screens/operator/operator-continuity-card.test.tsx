// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OperatorContinuityCard } from './operator-continuity-card'

afterEach(() => cleanup())

describe('OperatorContinuityCard', () => {
  it('renders cron, mission, incidents, and read-only locks', () => {
    render(
      <OperatorContinuityCard
        continuity={{
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
            {
              id: 'cron',
              label: 'Cron',
              status: 'PASS',
              path: '/opt/data/hermes-context/runtime/CRON-HEALTH.md',
              updated: '2026-09-02T10:39:37+00:00',
              exists: true,
            },
            {
              id: 'mission',
              label: 'Mission Control',
              status: 'PASS',
              path: '/opt/data/hermes-context/runtime/MISSION-CONTROL-HEALTH.md',
              updated: '2026-09-01T16:52:03+00:00',
              exists: true,
            },
          ],
          summary: 'Cron PASS, Mission Control PASS, Operator health PASS.',
        }}
      />,
    )

    expect(screen.getByRole('region', { name: 'Operator Continuity' })).toBeTruthy()
    expect(screen.getByText('Cron / watchdogs / mission health')).toBeTruthy()
    expect(screen.getByText('11')).toBeTruthy()
    expect(screen.getByText('33')).toBeTruthy()
    expect(screen.getAllByText('PASS').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('No auto-restart')).toBeTruthy()
    expect(screen.getByText('No auto-write')).toBeTruthy()
  })
})
