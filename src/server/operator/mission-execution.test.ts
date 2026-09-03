import { describe, expect, it } from 'vitest'
import { getOperatorMissionExecution } from './mission-execution'
import type { TaskRecord } from '../tasks-store'

function task(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: overrides.id ?? 'operator-mission-1',
    title: overrides.title ?? 'Operator Mission Execution v1',
    description: overrides.description ?? 'Build a readable mission card with proof and next GO.',
    column: overrides.column ?? 'in_progress',
    priority: overrides.priority ?? 'high',
    assignee: overrides.assignee ?? 'operator',
    tags: overrides.tags ?? ['operator', 'mission-execution'],
    due_date: overrides.due_date ?? null,
    position: overrides.position ?? 0,
    created_by: overrides.created_by ?? 'hermes',
    created_at: overrides.created_at ?? '2026-09-02T10:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-09-02T11:00:00.000Z',
    session_id: overrides.session_id ?? 'session-operator-1',
  }
}

describe('getOperatorMissionExecution', () => {
  it('summarizes the current Operator mission from Kanban tasks without enabling writes', () => {
    const status = getOperatorMissionExecution({
      tasks: [
        task(),
        task({ id: 'operator-proof-1', title: 'Operator proof collector', column: 'review', tags: ['operator', 'proof'] }),
        task({ id: 'dbm-1', title: 'DBM unrelated task', assignee: 'dbm', tags: ['dbm'], column: 'backlog' }),
      ],
    })

    expect(status.mode).toBe('workspace_operator_mission_execution_v1')
    expect(status.readOnly).toBe(true)
    expect(status.executionEnabled).toBe(false)
    expect(status.writeRouteEnabled).toBe(false)
    expect(status.kanban.link).toBe('/tasks?assignee=operator')
    expect(status.kanban.total).toBe(2)
    expect(status.kanban.inProgress).toBe(1)
    expect(status.kanban.review).toBe(1)
    expect(status.currentMission?.id).toBe('operator-mission-1')
    expect(status.currentMission?.status).toBe('in_progress')
    expect(status.proofs).toEqual(expect.arrayContaining(['Kanban task operator-mission-1 is in_progress']))
    expect(status.nextGo).toContain('GO Workspace live recreate Operator Mission Execution v1')
  })

  it('extracts a DBM real-work objective, proof report, and next GO from the mission task', () => {
    const status = getOperatorMissionExecution({
      tasks: [
        task({
          id: 'operator-dbm-saint-tropez-manual-outreach-v1',
          title: 'DBM — mission réelle Saint-Tropez outreach manuel',
          description: [
            'VRAI TRAVAIL DBM — préparer l’action manuelle Saint-Tropez Tourisme.',
            '',
            'Objectif: transformer Operator en mission de travail utile, pas seulement en panneau technique.',
            '',
            'Livrable produit: /opt/data/hermes-context/reports/operator-dbm-real-work-mission-saint-tropez-2026-09-02.md',
            'Source pack: /opt/data/hermes-context/reports/dbm-pack-manuel-priorise-review-only-2026-07-13.md',
            '',
            'Action prête pour Papa: GO email manuel Saint-Tropez.',
            'Canal: email/formulaire officiel seulement.',
            'Garde: Hermes ne doit pas envoyer, soumettre, marquer envoyé, activer AgentMail/Sender, écrire DBM prod, pousser ou déployer sans GO spécifique.',
          ].join('\n'),
          tags: ['operator', 'dbm', 'revenue', 'mission-execution', 'manual-outreach'],
        }),
      ],
    })

    expect(status.currentMission?.businessArea).toBe('DBM')
    expect(status.currentMission?.objective).toBe('transformer Operator en mission de travail utile, pas seulement en panneau technique.')
    expect(status.currentMission?.proofReportPath).toBe('/opt/data/hermes-context/reports/operator-dbm-real-work-mission-saint-tropez-2026-09-02.md')
    expect(status.currentMission?.sourceReportPath).toBe('/opt/data/hermes-context/reports/dbm-pack-manuel-priorise-review-only-2026-07-13.md')
    expect(status.currentMission?.nextHumanGo).toBe('GO email manuel Saint-Tropez')
    expect(status.currentMission?.externalActionReadOnly).toBe(true)
    expect(status.currentMission?.actionSurface).toEqual({
      label: 'Ouvrir le vrai cockpit DBM Outreach',
      href: 'https://cockpit.directbookingmanager.com/outreach',
      kind: 'external_cockpit',
      ownsExecution: true,
    })
    expect(status.currentMission?.operatorOwnsExecution).toBe(false)
    expect(status.proofs).toEqual(expect.arrayContaining(['Business proof report /opt/data/hermes-context/reports/operator-dbm-real-work-mission-saint-tropez-2026-09-02.md']))
    expect(status.proofs).toEqual(expect.arrayContaining(['Execution belongs to DBM Cockpit, not Hermes Workspace']))
    expect(status.summary).toContain('DBM real-work mission')
  })

  it('reports attention when no Operator mission exists yet', () => {
    const status = getOperatorMissionExecution({ tasks: [] })

    expect(status.overallStatus).toBe('ATTENTION')
    expect(status.currentMission).toBeNull()
    expect(status.kanban.total).toBe(0)
    expect(status.summary).toContain('No Operator mission task')
  })
})
