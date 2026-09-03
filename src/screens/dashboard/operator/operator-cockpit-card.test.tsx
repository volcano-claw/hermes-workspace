// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OperatorCockpitCard } from './operator-cockpit-card'

afterEach(() => cleanup())

describe('OperatorCockpitCard', () => {
  it('renders Operator phase, incidents, and read-only guardrails', () => {
    render(
      <OperatorCockpitCard
        status={{
          reachable: true,
          ok: true,
          operatorStatus: 'attention',
          phaseClosureStatus: 'ATTENTION',
          localControlPlaneClosed: false,
          openIncidents: 0,
          goStopGates: 8,
          writeActionsEnabled: false,
          deployAllowedWithoutGo: false,
          peerDispatchAllowedWithoutGo: false,
          summary: 'Operator cockpit status is reachable and reports OK.',
        }}
      />,
    )

    const card = screen.getByRole('region', { name: 'Operator Cockpit' })
    expect(within(card).getByText('Operator Cockpit')).toBeTruthy()
    expect(screen.getByText('attention')).toBeTruthy()
    expect(screen.getByText('Phase')).toBeTruthy()
    expect(screen.getByText('ATTENTION')).toBeTruthy()
    expect(screen.getByText('Incidents')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
    expect(screen.getByText('GO/STOP')).toBeTruthy()
    expect(screen.getByText('8')).toBeTruthy()
    expect(screen.getByText('Read-only')).toBeTruthy()
    expect(screen.getByText('Write actions')).toBeTruthy()
    expect(screen.getByText('Deploy without GO')).toBeTruthy()
    expect(screen.getByText('Peer dispatch')).toBeTruthy()
    expect(screen.getAllByText('locked')).toHaveLength(3)
  })

  it('renders unavailable state without enabling actions', () => {
    render(<OperatorCockpitCard status={undefined} />)

    const card = screen.getByRole('region', { name: 'Operator Cockpit' })
    expect(within(card).getByText('Operator Cockpit')).toBeTruthy()
    expect(screen.getByText('Unavailable')).toBeTruthy()
    expect(screen.getByText('Read-only')).toBeTruthy()
    expect(screen.getByText('Write actions')).toBeTruthy()
    expect(screen.getAllByText('locked')).toHaveLength(3)
  })
})
