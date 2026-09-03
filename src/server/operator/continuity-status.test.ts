import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getOperatorContinuityStatus } from './continuity-status'

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'operator-continuity-'))
}

function writeRuntimeFile(root: string, name: string, content: string) {
  const dir = path.join(root, 'runtime')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, name), content)
}

describe('operator continuity status', () => {
  const roots: Array<string> = []

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('summarizes cron, mission, and health files as read-only continuity state', () => {
    const root = makeTempRoot()
    roots.push(root)
    writeRuntimeFile(root, 'CRON-HEALTH.md', [
      '# CRON-HEALTH — Hermes',
      'Updated: 2026-09-02T10:39:37+00:00',
      'Status: **PASS**',
      '- **Hermes Continuity Check** (`78fc53b6c610`): enabled=True state=scheduled last=ok next=2026-09-07T09:00:00+00:00 script=hermes-continuity-check.sh',
      '- **Hermes Redacted Backup** (`0196ee52f8d3`): enabled=True state=scheduled last=ok next=2026-09-07T09:00:00+00:00 script=hermes-redacted-backup.sh',
    ].join('\n'))
    writeRuntimeFile(root, 'MISSION-CONTROL-HEALTH.md', [
      '# MISSION-CONTROL-HEALTH — Hermes / Operator',
      'Updated: 2026-09-01T16:52:03+00:00',
      'Status: **PASS**',
      '- `completed=33`',
    ].join('\n'))
    writeRuntimeFile(root, 'OPERATOR-HEALTH.md', [
      '# OPERATOR-HEALTH',
      'Updated: 2026-09-02T10:40:00+00:00',
      'Status: **PASS**',
      '- `open_incidents=0`',
    ].join('\n'))

    const status = getOperatorContinuityStatus({ contextRoot: root })

    expect(status).toMatchObject({
      mode: 'workspace_operator_continuity_v1',
      readOnly: true,
      overallStatus: 'PASS',
      cronStatus: 'PASS',
      missionStatus: 'PASS',
      operatorHealthStatus: 'PASS',
      scheduledJobs: 2,
      lastCronOk: true,
      openIncidents: 0,
      completedMissions: 33,
    })
    expect(status.healthFiles).toHaveLength(3)
    expect(status.summary).toContain('Cron PASS')
  })

  it('fails closed when health files are missing', () => {
    const root = makeTempRoot()
    roots.push(root)

    const status = getOperatorContinuityStatus({ contextRoot: root })

    expect(status).toMatchObject({
      readOnly: true,
      overallStatus: 'ATTENTION',
      cronStatus: 'missing',
      missionStatus: 'missing',
      operatorHealthStatus: 'missing',
      scheduledJobs: 0,
      lastCronOk: false,
      openIncidents: null,
      completedMissions: null,
    })
  })
})
