// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OperatorMissionExecutionCard } from './operator-mission-execution-card'

describe('OperatorMissionExecutionCard', () => {
  it('renders readable mission status, Kanban link, proofs, and next GO without action buttons', () => {
    render(
      <OperatorMissionExecutionCard
        missionExecution={{
          mode: 'workspace_operator_mission_execution_v1',
          readOnly: true,
          overallStatus: 'PASS/PARTIAL',
          executionEnabled: false,
          writeRouteEnabled: false,
          checkedAt: '2026-09-02T11:30:00.000Z',
          currentMission: {
            id: 'operator-mission-1',
            title: 'Operator Mission Execution v1',
            status: 'in_progress',
            priority: 'high',
            assignee: 'operator',
            updatedAt: '2026-09-02T11:00:00.000Z',
            description: 'Build a readable mission card.',
            businessArea: 'DBM',
            objective: 'préparer l’action manuelle Saint-Tropez Tourisme.',
            proofReportPath: '/opt/data/hermes-context/reports/operator-dbm-real-work-mission-saint-tropez-2026-09-02.md',
            sourceReportPath: '/opt/data/hermes-context/reports/dbm-pack-manuel-priorise-review-only-2026-07-13.md',
            nextHumanGo: 'GO email manuel Saint-Tropez',
            externalActionReadOnly: true,
            operatorOwnsExecution: false,
            actionSurface: {
              label: 'Ouvrir le vrai cockpit DBM Outreach',
              href: 'https://cockpit.directbookingmanager.com/outreach',
              kind: 'external_cockpit',
              ownsExecution: true,
            },
          },
          kanban: {
            link: '/tasks?assignee=operator',
            total: 2,
            backlog: 0,
            todo: 0,
            inProgress: 1,
            review: 1,
            blocked: 0,
            done: 0,
          },
          proofs: ['Kanban task operator-mission-1 is in_progress', 'No write route enabled'],
          nextGo: 'GO Workspace live recreate Operator Mission Execution v1 — recréer seulement hermes-workspace avec rollback, vérifier /operator mission panel, no push',
          summary: 'Operator mission is visible and linked to Kanban.',
        }}
      />,
    )

    expect(screen.getByRole('region', { name: 'Operator Mission Execution' })).toBeTruthy()
    expect(screen.getByText('PASS/PARTIAL')).toBeTruthy()
    expect(screen.getByText('Operator Mission Execution v1')).toBeTruthy()
    expect(screen.getByText('Objectif')).toBeTruthy()
    expect(screen.getByText('préparer l’action manuelle Saint-Tropez Tourisme.')).toBeTruthy()
    expect(screen.getByText(/operator-dbm-real-work-mission-saint-tropez-2026-09-02.md/)).toBeTruthy()
    expect(screen.getByText(/GO email manuel Saint-Tropez/)).toBeTruthy()
    expect(screen.getByText('Anti-doublon')).toBeTruthy()
    expect(screen.getByText(/Operator pilote/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Ouvrir le vrai cockpit DBM Outreach/i }).getAttribute('href')).toBe('https://cockpit.directbookingmanager.com/outreach')
    expect(screen.getByText('in_progress')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open Kanban/i }).getAttribute('href')).toBe('/tasks?assignee=operator')
    expect(screen.getByText(/Kanban task operator-mission-1 is in_progress/)).toBeTruthy()
    expect(screen.getByText(/GO Workspace live recreate Operator Mission Execution v1/)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
