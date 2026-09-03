import fs from 'node:fs'
import path from 'node:path'

export type OperatorContinuityHealthFile = {
  id: string
  label: string
  path: string
  status: string
  updated: string | null
  exists: boolean
}

export type WorkspaceOperatorContinuityStatus = {
  mode: 'workspace_operator_continuity_v1'
  readOnly: true
  overallStatus: 'PASS' | 'ATTENTION'
  cronStatus: string
  missionStatus: string
  operatorHealthStatus: string
  scheduledJobs: number
  lastCronOk: boolean
  openIncidents: number | null
  completedMissions: number | null
  healthFiles: Array<OperatorContinuityHealthFile>
  summary: string
}

type Options = {
  contextRoot?: string
}

const DEFAULT_CONTEXT_ROOT = '/opt/data/hermes-context'

function readText(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

function statusFrom(text: string | null): string {
  if (!text) return 'missing'
  const match = text.match(/^Status:\s*\*\*([^*]+)\*\*/m)
  return match?.[1]?.trim() || 'unknown'
}

function updatedFrom(text: string | null): string | null {
  if (!text) return null
  const match = text.match(/^Updated:\s*(.+)$/m)
  return match?.[1]?.trim() || null
}

function numberFrom(text: string | null, key: string): number | null {
  if (!text) return null
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp('`' + escaped + '=([0-9]+)`'))
  return match ? Number(match[1]) : null
}

function countCronJobs(text: string | null): number {
  if (!text) return 0
  return text
    .split('\n')
    .filter((line) => line.includes('**') && line.includes('enabled=')).length
}

function cronLastOk(text: string | null): boolean {
  if (!text) return false
  const jobs = text
    .split('\n')
    .filter((line) => line.includes('**') && line.includes('enabled='))
  return jobs.length > 0 && jobs.every((line) => line.includes('last=ok'))
}

function healthFile(
  root: string,
  id: string,
  label: string,
  filename: string,
): { file: OperatorContinuityHealthFile; text: string | null } {
  const filePath = path.join(root, 'runtime', filename)
  const text = readText(filePath)
  return {
    text,
    file: {
      id,
      label,
      path: filePath,
      status: statusFrom(text),
      updated: updatedFrom(text),
      exists: text !== null,
    },
  }
}

export function getOperatorContinuityStatus(
  options: Options = {},
): WorkspaceOperatorContinuityStatus {
  const root = options.contextRoot ?? DEFAULT_CONTEXT_ROOT
  const cron = healthFile(root, 'cron', 'Cron', 'CRON-HEALTH.md')
  const mission = healthFile(
    root,
    'mission_control',
    'Mission Control',
    'MISSION-CONTROL-HEALTH.md',
  )
  const operator = healthFile(root, 'operator_health', 'Operator Health', 'OPERATOR-HEALTH.md')

  const files = [cron.file, mission.file, operator.file]
  const passing = files.every((file) => file.status === 'PASS')
  const scheduledJobs = countCronJobs(cron.text)
  const lastCronOk = cronLastOk(cron.text)
  const openIncidents = numberFrom(operator.text, 'open_incidents')
  const completedMissions = numberFrom(mission.text, 'completed')
  const overallStatus = passing && lastCronOk ? 'PASS' : 'ATTENTION'

  return {
    mode: 'workspace_operator_continuity_v1',
    readOnly: true,
    overallStatus,
    cronStatus: cron.file.status,
    missionStatus: mission.file.status,
    operatorHealthStatus: operator.file.status,
    scheduledJobs,
    lastCronOk,
    openIncidents,
    completedMissions,
    healthFiles: files,
    summary: `Cron ${cron.file.status}, Mission Control ${mission.file.status}, Operator health ${operator.file.status}.`,
  }
}
