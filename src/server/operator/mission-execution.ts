import { listTasks } from '../tasks-store'
import type { TaskColumn, TaskPriority, TaskRecord } from '../tasks-store'

export type OperatorMissionSummary = {
  id: string
  title: string
  description: string
  status: TaskColumn
  priority: TaskPriority
  assignee: string | null
  updatedAt: string
  businessArea: string | null
  objective: string | null
  proofReportPath: string | null
  sourceReportPath: string | null
  nextHumanGo: string | null
  externalActionReadOnly: boolean
  operatorOwnsExecution: boolean
  actionSurface: OperatorMissionActionSurface | null
}

export type OperatorMissionActionSurface = {
  label: string
  href: string
  kind: 'external_cockpit'
  ownsExecution: boolean
}

export type OperatorMissionKanbanSummary = {
  link: '/tasks?assignee=operator'
  total: number
  backlog: number
  todo: number
  inProgress: number
  review: number
  blocked: number
  done: number
}

export type WorkspaceOperatorMissionExecution = {
  mode: 'workspace_operator_mission_execution_v1'
  readOnly: true
  overallStatus: 'PASS/PARTIAL' | 'ATTENTION'
  executionEnabled: false
  writeRouteEnabled: false
  checkedAt: string
  currentMission: OperatorMissionSummary | null
  kanban: OperatorMissionKanbanSummary
  proofs: Array<string>
  nextGo: string
  summary: string
}

const MODE = 'workspace_operator_mission_execution_v1' as const
const KANBAN_LINK = '/tasks?assignee=operator' as const
const NEXT_GO =
  'GO Workspace live recreate Operator Mission Execution v1 — recréer seulement hermes-workspace avec rollback, vérifier /operator mission panel, no push'

const REPORT_PATH_PATTERN = /\/opt\/data\/hermes-context\/reports\/[^\s`]+\.md/g
const DBM_COCKPIT_OUTREACH_URL = 'https://cockpit.directbookingmanager.com/outreach'
const DBM_COCKPIT_PIPELINE_URL = 'https://cockpit.directbookingmanager.com/pipeline'

function nowIso(): string {
  return new Date().toISOString()
}

function isOperatorTask(task: TaskRecord): boolean {
  const haystack = [
    task.assignee ?? '',
    task.title,
    task.description,
    ...task.tags,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes('operator') || haystack.includes('mission-execution')
}

function taskWeight(column: TaskColumn): number {
  switch (column) {
    case 'in_progress':
      return 0
    case 'review':
      return 1
    case 'todo':
      return 2
    case 'blocked':
      return 3
    case 'backlog':
      return 4
    case 'done':
      return 5
    case 'deleted':
      return 6
  }
}

function extractLineValue(description: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = description.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'im'))
  return match?.[1]?.trim().replace(/`+$/g, '') || null
}

function extractReportPath(description: string, prefix: string): string | null {
  const line = extractLineValue(description, prefix)
  const fromLine = line?.match(REPORT_PATH_PATTERN)?.[0]
  if (fromLine) return fromLine

  const reports = description.match(REPORT_PATH_PATTERN) ?? []
  if (prefix.toLowerCase().includes('source')) {
    return reports.find((report) => report.includes('pack') || report.includes('source')) ?? null
  }
  return reports.find((report) => !report.includes('pack')) ?? reports[0] ?? null
}

function inferBusinessArea(task: TaskRecord): string | null {
  const haystack = [task.title, task.description, ...task.tags].join(' ').toLowerCase()
  if (haystack.includes('dbm') || haystack.includes('direct booking manager')) return 'DBM'
  return null
}

function isExternalActionReadOnly(task: TaskRecord): boolean {
  const haystack = [task.description, ...task.tags].join(' ').toLowerCase()
  return (
    haystack.includes('ne doit pas envoyer') ||
    haystack.includes('external') ||
    haystack.includes('manuel') ||
    haystack.includes('manual-outreach') ||
    haystack.includes('agentmail/sender')
  )
}

function resolveActionSurface(task: TaskRecord): OperatorMissionActionSurface | null {
  const haystack = [task.title, task.description, ...task.tags].join(' ').toLowerCase()
  if (!inferBusinessArea(task)) return null

  if (
    haystack.includes('outreach') ||
    haystack.includes('saint-tropez') ||
    haystack.includes('email manuel') ||
    haystack.includes('formulaire') ||
    haystack.includes('manual-outreach')
  ) {
    return {
      label: 'Ouvrir le vrai cockpit DBM Outreach',
      href: DBM_COCKPIT_OUTREACH_URL,
      kind: 'external_cockpit',
      ownsExecution: true,
    }
  }

  return {
    label: 'Ouvrir le vrai cockpit DBM Pipeline',
    href: DBM_COCKPIT_PIPELINE_URL,
    kind: 'external_cockpit',
    ownsExecution: true,
  }
}

function summarizeMission(task: TaskRecord): OperatorMissionSummary {
  const objective = extractLineValue(task.description, 'Objectif')
  const proofReportPath = extractReportPath(task.description, 'Livrable produit')
  const sourceReportPath = extractReportPath(task.description, 'Source pack')
  const nextHumanGo = extractLineValue(task.description, 'Action prête pour Papa')?.replace(/\.$/, '') ?? null

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.column,
    priority: task.priority,
    assignee: task.assignee,
    updatedAt: task.updated_at,
    businessArea: inferBusinessArea(task),
    objective,
    proofReportPath,
    sourceReportPath,
    nextHumanGo,
    externalActionReadOnly: isExternalActionReadOnly(task),
    operatorOwnsExecution: false,
    actionSurface: resolveActionSurface(task),
  }
}

function countColumn(tasks: Array<TaskRecord>, column: TaskColumn): number {
  return tasks.filter((task) => task.column === column).length
}

export function getOperatorMissionExecution(options?: {
  tasks?: Array<TaskRecord>
}): WorkspaceOperatorMissionExecution {
  const allTasks = options?.tasks ?? listTasks({ includeDone: true })
  const operatorTasks = allTasks
    .filter((task) => task.column !== 'deleted')
    .filter(isOperatorTask)
    .sort(
      (a, b) =>
        taskWeight(a.column) - taskWeight(b.column) ||
        b.updated_at.localeCompare(a.updated_at),
    )

  const currentMission = operatorTasks[0] ? summarizeMission(operatorTasks[0]) : null
  const kanban: OperatorMissionKanbanSummary = {
    link: KANBAN_LINK,
    total: operatorTasks.length,
    backlog: countColumn(operatorTasks, 'backlog'),
    todo: countColumn(operatorTasks, 'todo'),
    inProgress: countColumn(operatorTasks, 'in_progress'),
    review: countColumn(operatorTasks, 'review'),
    blocked: countColumn(operatorTasks, 'blocked'),
    done: countColumn(operatorTasks, 'done'),
  }

  const proofs = currentMission
    ? [
        `Kanban task ${currentMission.id} is ${currentMission.status}`,
        `Kanban link ${KANBAN_LINK} filters Operator tasks`,
        ...(currentMission.proofReportPath ? [`Business proof report ${currentMission.proofReportPath}`] : []),
        ...(currentMission.actionSurface ? ['Execution belongs to DBM Cockpit, not Hermes Workspace'] : []),
        'No write route enabled',
        currentMission.externalActionReadOnly
          ? 'External actions remain manual or GO-gated'
          : 'Execution controls remain locked until GO/STOP middleware exists',
      ]
    : [
        'No Operator mission task found in Kanban',
        `Kanban link ${KANBAN_LINK} is ready for Operator tasks`,
        'No write route enabled',
      ]

  return {
    mode: MODE,
    readOnly: true,
    overallStatus: currentMission ? 'PASS/PARTIAL' : 'ATTENTION',
    executionEnabled: false,
    writeRouteEnabled: false,
    checkedAt: nowIso(),
    currentMission,
    kanban,
    proofs,
    nextGo: NEXT_GO,
    summary: currentMission
      ? `${currentMission.businessArea ? `${currentMission.businessArea} real-work mission` : 'Operator mission'} is visible and linked to Kanban.`
      : 'No Operator mission task exists yet; create or assign one in Kanban before controlled execution.',
  }
}
