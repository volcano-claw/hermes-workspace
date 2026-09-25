import fs from 'node:fs'
import path from 'node:path'

export type FleetState =
  | 'upstream_review'
  | 'decision_due'
  | 'stale_review'
  | 'archive_review'
  | 'needs_evidence'
  | 'current'

export interface GitHubFleetRepository {
  name: string
  fullName: string
  url: string
  category: string
  purpose: string
  enables: string
  portfolioDecision: string
  portfolioNextAction: string
  visibility: string
  fork: boolean
  parent: string | null
  language: string | null
  license: string | null
  archived: boolean
  defaultBranch: string | null
  updatedAt: string | null
  pushedAt: string | null
  ageDays: number | null
  stars: number | null
  openIssues: number | null
  aheadBy: number | null
  behindBy: number | null
  compareStatus: string | null
  audit: {
    state: FleetState
    priority: number
    reason: string
    recommendedAction: string
  }
  error: string | null
}

export interface GitHubFleetAudit {
  schemaVersion: number
  generatedAt: string
  source: string
  authenticated: boolean
  coverage: {
    expected: number
    audited: number
    errors: number
    complete: boolean
  }
  summary: {
    states: Partial<Record<FleetState, number>>
    forks: number
    behindUpstream: number
    private: number
  }
  repositories: GitHubFleetRepository[]
}

export function githubFleetAuditPath(home?: string) {
  const roots = home
    ? [home]
    : ['/opt/data', process.env.HERMES_HOME || '', '/home/workspace/.hermes']
  const root = roots.find((candidate) =>
    candidate && fs.existsSync(path.join(candidate, 'hermes-context/runtime/GITHUB-FLEET-AUDIT.json')),
  ) || roots.find(Boolean) || '/opt/data'
  return path.join(root, 'hermes-context/runtime/GITHUB-FLEET-AUDIT.json')
}

export function readGitHubFleetAudit(filePath = githubFleetAuditPath()): GitHubFleetAudit {
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as GitHubFleetAudit
  if (payload.schemaVersion !== 1) throw new Error('Unsupported GitHub fleet audit schema')
  if (!payload.coverage?.complete) throw new Error('Incomplete GitHub fleet audit')
  if (payload.coverage.audited !== payload.coverage.expected) throw new Error('GitHub fleet coverage mismatch')
  if (payload.repositories.length !== payload.coverage.expected) throw new Error('GitHub fleet repository count mismatch')
  return payload
}
