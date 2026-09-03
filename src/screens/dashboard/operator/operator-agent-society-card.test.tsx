// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OperatorAgentSocietyCard } from './operator-agent-society-card'

afterEach(() => cleanup())

describe('OperatorAgentSocietyCard', () => {
  it('renders planned agent lanes, cells, and locked dispatch guardrails', () => {
    render(
      <OperatorAgentSocietyCard
        society={{
          mode: 'workspace_operator_agent_society_v1',
          reachable: true,
          readOnly: true,
          lanesTotal: 8,
          bindingsTotal: 11,
          inactiveLanesTotal: 0,
          peerEnabledLanes: 0,
          cellsTotal: 2,
          laneIds: ['controller', 'builder', 'auditor'],
          cells: [
            { id: 'cell:operator-control-plane', displayName: 'Operator Control Plane', statusHint: 'healthy' },
            { id: 'cell:openclaw-vps-main', displayName: 'OpenClaw VPS Main', statusHint: 'healthy' },
          ],
          peerDispatchEnabled: false,
          autonomousDispatchEnabled: false,
          summary: 'Operator agent society is visible in read-only mode.',
          checkedAt: '2026-09-01T00:00:00.000Z',
        }}
      />,
    )

    const card = screen.getByRole('region', { name: 'Operator Agent Society' })
    expect(within(card).getByText('Operator Agent Society')).toBeTruthy()
    expect(screen.getByText('8')).toBeTruthy()
    expect(screen.getAllByText('Lanes').length).toBeGreaterThan(0)
    expect(screen.getByText('11')).toBeTruthy()
    expect(screen.getByText('Bindings')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getAllByText('Cells').length).toBeGreaterThan(0)
    expect(screen.getByText('controller')).toBeTruthy()
    expect(screen.getByText('builder')).toBeTruthy()
    expect(screen.getByText('auditor')).toBeTruthy()
    expect(screen.getByText('Operator Control Plane')).toBeTruthy()
    expect(screen.getByText('OpenClaw VPS Main')).toBeTruthy()
    expect(screen.getByText('Peer dispatch')).toBeTruthy()
    expect(screen.getByText('Autonomous dispatch')).toBeTruthy()
    expect(screen.getAllByText('locked')).toHaveLength(2)
  })

  it('renders unavailable state without dispatch controls', () => {
    render(<OperatorAgentSocietyCard society={undefined} />)

    const card = screen.getByRole('region', { name: 'Operator Agent Society' })
    expect(within(card).getByText('Operator Agent Society')).toBeTruthy()
    expect(screen.getByText('Unavailable')).toBeTruthy()
    expect(screen.getByText('Peer dispatch')).toBeTruthy()
    expect(screen.getAllByText('locked')).toHaveLength(2)
  })
})
