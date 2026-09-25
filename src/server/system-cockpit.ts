import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { listTasks } from './tasks-store'
import { listSwarmWorkerIds } from './swarm-foundation'

export type SystemConnectionStatus = 'PASS' | 'ATTENTION' | 'STOP'

export type SystemConnection = {
  id: string
  label: string
  status: SystemConnectionStatus
  detail: string
  evidence: string
  href?: string
}

export type SystemBoundary = {
  id: string
  label: string
  value: string
  detail: string
}

export type SystemCockpitSnapshot = {
  mode: 'workspace_system_cockpit_v1'
  readOnly: true
  checkedAt: string
  summary: string
  identity: {
    principle: 'one_hermes_multiple_interfaces'
    workspaceContainer: string
    hermesHome: string
    home: string
    knowledgeDir: string | null
    tasksHome: string
    apiUrl: string
    operatorApiUrl: string | null
  }
  connections: Array<SystemConnection>
  boundaries: Array<SystemBoundary>
  counts: {
    tasks: number
    tasksInProgress: number
    tasksReview: number
    tasksBlocked: number
    swarmWorkers: number
  }
}

type Options = {
  now?: Date
  fetchImpl?: typeof fetch
  hermesHome?: string
  knowledgeDir?: string
  tasksHome?: string
  contextRoot?: string
  canonicalHermesHome?: string
}

const DEFAULT_CONTEXT_ROOT = '/opt/data/hermes-context'
const MUTUAL_CARE_FILE = 'runtime/MUTUAL-CARE-HOST-RESCUE.md'

function iso(date = new Date()): string {
  return date.toISOString()
}

function exists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

function readable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}

function writable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

function statMtime(filePath: string): string | null {
  try {
    return fs.statSync(filePath).mtime.toISOString()
  } catch {
    return null
  }
}

function readText(filePath: string, maxChars = 20_000): string | null {
  try {
    const text = fs.readFileSync(filePath, 'utf-8')
    return text.length > maxChars ? text.slice(0, maxChars) : text
  } catch {
    return null
  }
}

function statusFromMarkdown(text: string | null): string | null {
  if (!text) return null
  const explicit = text.match(/^Status:\s*\*\*([^*]+)\*\*/m)?.[1]?.trim()
  if (explicit) return explicit
  const heading = text.match(/^##\s+(PASS|ATTENTION|STOP)\b/m)?.[1]?.trim()
  if (heading) return heading
  if (/\bPASS\b/.test(text)) return 'PASS'
  if (/\bSTOP\b/.test(text)) return 'STOP'
  if (/\bATTENTION\b/.test(text)) return 'ATTENTION'
  return null
}

function connection(
  id: string,
  label: string,
  status: SystemConnectionStatus,
  detail: string,
  evidence: string,
  href?: string,
): SystemConnection {
  return { id, label, status, detail, evidence, href }
}

async function probeUrl(fetchImpl: typeof fetch, url: string): Promise<{ ok: boolean; status: number | null }> {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(2_500) })
    return { ok: response.ok, status: response.status }
  } catch {
    return { ok: false, status: null }
  }
}

export async function getSystemCockpitSnapshot(
  options: Options = {},
): Promise<SystemCockpitSnapshot> {
  const now = options.now ?? new Date()
  const fetchImpl = options.fetchImpl ?? fetch
  const hermesHome = options.hermesHome ?? process.env.HERMES_HOME ?? process.env.CLAUDE_HOME ?? path.join(os.homedir(), '.hermes')
  const knowledgeDir = options.knowledgeDir ?? process.env.KNOWLEDGE_DIR ?? null
  const tasksHome = options.tasksHome ?? process.env.HERMES_WORKSPACE_TASKS_HOME ?? hermesHome
  const contextRoot = options.contextRoot ?? DEFAULT_CONTEXT_ROOT
  const canonicalHermesHome = options.canonicalHermesHome
    ?? (readable('/opt/data/config.yaml') ? '/opt/data' : hermesHome)
  const apiUrl = (process.env.HERMES_API_URL || process.env.CLAUDE_API_URL || 'http://127.0.0.1:8642').replace(/\/+$/, '')
  const operatorApiUrl = (process.env.HERMES_OPERATOR_API_URL || process.env.OPERATOR_API_URL || '').replace(/\/+$/, '') || null

  const configPath = path.join(canonicalHermesHome, 'config.yaml')
  const stateDbPath = path.join(canonicalHermesHome, 'state.db')
  const memoryPath = path.join(canonicalHermesHome, 'memories', 'MEMORY.md')
  const tasksPath = path.join(tasksHome, 'tasks.json')
  const jarvisCanon = process.env.JARVIS_SIBLING_CANON || '/mnt/jarvis/workspace/HERMES-JARVIS-SIBLING.md'
  const jarvisBridge = process.env.JARVIS_BRIDGE_DIR || '/mnt/jarvis/bridge/hermes-jarvis'
  const mutualPath = path.join(contextRoot, MUTUAL_CARE_FILE)

  const [apiProbe, operatorProbe] = await Promise.all([
    probeUrl(fetchImpl, `${apiUrl}/health`),
    operatorApiUrl ? probeUrl(fetchImpl, `${operatorApiUrl}/health`) : Promise.resolve({ ok: false, status: null }),
  ])

  const taskList = listTasks({ includeDone: true })
  const swarmWorkers = listSwarmWorkerIds()
  const mutualText = readText(mutualPath)
  const mutualStatus = statusFromMarkdown(mutualText)
  const hermesReadable = readable(configPath) && readable(stateDbPath) && readable(memoryPath)
  const tasksWritable = exists(tasksPath) ? writable(tasksPath) : writable(tasksHome)
  const jarvisReadable = readable(jarvisCanon) && readable(jarvisBridge)
  const vaultReadable = knowledgeDir ? readable(knowledgeDir) : false

  const connections: Array<SystemConnection> = [
    connection(
      'hermes-core',
      'Hermes central',
      apiProbe.ok && hermesReadable ? 'PASS' : 'ATTENTION',
      apiProbe.ok ? 'API interne joignable; profil Hermes réel monté en lecture.' : 'API interne non confirmée depuis Workspace.',
      `health=${apiProbe.status ?? 'unreachable'} config=${readable(configPath)} state_db=${readable(stateDbPath)} memory=${readable(memoryPath)}`,
      '/chat',
    ),
    connection(
      'memory-vault',
      'Mémoire / vault',
      vaultReadable && readable(memoryPath) ? 'PASS' : 'ATTENTION',
      'Workspace voit la mémoire Hermes courte et le vault maison en lecture seule.',
      `memory=${memoryPath} vault=${knowledgeDir ?? 'unset'}`,
      '/memory',
    ),
    connection(
      'tasks-kanban',
      'Tasks / Kanban',
      tasksWritable ? 'PASS' : 'ATTENTION',
      'Tasks utilise un volume Workspace dédié; le vrai HERMES_HOME reste protégé.',
      `tasks=${taskList.length} file=${tasksPath} writable=${tasksWritable}`,
      '/tasks',
    ),
    connection(
      'jarvis',
      'Jarvis / OpenClaw',
      jarvisReadable ? 'PASS' : 'ATTENTION',
      'Pont fraternel visible en lecture seule; aucune mutation Jarvis depuis Workspace.',
      `canon=${readable(jarvisCanon)} bridge=${readable(jarvisBridge)}`,
      '/jarvis',
    ),
    connection(
      'mutual-care',
      'Mutual Care Rescue',
      mutualStatus === 'PASS' ? 'PASS' : mutualStatus === 'STOP' ? 'STOP' : 'ATTENTION',
      'Surveillance externe Hermes ↔ Jarvis visible dans le cockpit.',
      `file=${mutualPath} status=${mutualStatus ?? 'unknown'} updated=${statMtime(mutualPath) ?? 'missing'}`,
    ),
    connection(
      'operator-api',
      'Operator API',
      operatorApiUrl && operatorProbe.ok ? 'PASS' : 'ATTENTION',
      operatorApiUrl ? 'OperatorAPI connecté en lecture seule.' : 'OperatorAPI non configuré dans Workspace.',
      `url=${operatorApiUrl ?? 'unset'} health=${operatorProbe.status ?? 'unreachable'}`,
      '/operator',
    ),
    connection(
      'swarm',
      'Teams / Swarm',
      'PASS',
      swarmWorkers.length > 0
        ? 'Profils agents détectés; lancement autonome reste soumis aux garde-fous.'
        : 'Surface Teams/Swarm connectée; aucun worker actif détecté pour le moment.',
      `workers=${swarmWorkers.length}`,
      '/swarm',
    ),
    connection(
      'terminal',
      'Terminal Workspace',
      exists('/usr/bin/python3') || exists('/usr/local/bin/python3') ? 'PASS' : 'ATTENTION',
      'Terminal shell = conteneur hermes-workspace, pas shell VPS direct.',
      `python3=${exists('/usr/bin/python3') || exists('/usr/local/bin/python3')} docker_sock=${exists('/var/run/docker.sock')}`,
      '/terminal',
    ),
  ]

  const boundaries: Array<SystemBoundary> = [
    { id: 'identity', label: 'Identité', value: 'Un Hermes / plusieurs interfaces', detail: 'Telegram et Workspace pointent vers le même socle Hermes, mais peuvent rester des sessions différentes.' },
    { id: 'writes', label: 'Écritures', value: 'GO requis', detail: 'Provider, secrets, Docker, Caddy, redémarrage Hermes/Jarvis et actions externes restent bloqués sans GO explicite.' },
    { id: 'terminal-boundary', label: 'Terminal', value: 'Conteneur Workspace', detail: 'Le terminal intégré ne promet pas un shell hôte VPS ni Docker direct.' },
    { id: 'tasks-boundary', label: 'Kanban', value: 'Volume dédié', detail: 'Le fichier tasks.json est séparé du HERMES_HOME réel pour garder la mémoire/config en lecture seule.' },
    { id: 'jarvis-boundary', label: 'Jarvis', value: 'Lecture seule', detail: 'Workspace lit le contrat/pont Jarvis; pas de réparation ou dispatch sans GO.' },
  ]

  const hardStops = connections.filter((item) => item.status === 'STOP').length
  const attentions = connections.filter((item) => item.status === 'ATTENTION').length

  return {
    mode: 'workspace_system_cockpit_v1',
    readOnly: true,
    checkedAt: iso(now),
    summary: hardStops
      ? 'STOP présent sur une connexion système; aucune action dangereuse automatique.'
      : attentions
        ? 'Workspace est connecté, avec points à vérifier visibles.'
        : 'Workspace est connecté au socle Hermes/Jarvis/Operator en lecture seule.',
    identity: {
      principle: 'one_hermes_multiple_interfaces',
      workspaceContainer: process.env.HOSTNAME || 'hermes-workspace',
      hermesHome,
      home: os.homedir(),
      knowledgeDir,
      tasksHome,
      apiUrl,
      operatorApiUrl,
    },
    connections,
    boundaries,
    counts: {
      tasks: taskList.length,
      tasksInProgress: taskList.filter((task) => task.column === 'in_progress').length,
      tasksReview: taskList.filter((task) => task.column === 'review').length,
      tasksBlocked: taskList.filter((task) => task.column === 'blocked').length,
      swarmWorkers: swarmWorkers.length,
    },
  }
}
