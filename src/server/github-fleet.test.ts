import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readGitHubFleetAudit } from './github-fleet'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

function fixture(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-25T09:00:00+00:00',
    source: 'test',
    authenticated: true,
    coverage: { expected: 1, audited: 1, errors: 0, complete: true },
    summary: { states: { current: 1 }, forks: 1, behindUpstream: 0, private: 0 },
    repositories: [{ fullName: 'volcano-claw/example' }],
    ...overrides,
  }
}

function write(payload: unknown) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-fleet-'))
  dirs.push(dir)
  const file = path.join(dir, 'audit.json')
  fs.writeFileSync(file, JSON.stringify(payload))
  return file
}

describe('readGitHubFleetAudit', () => {
  it('accepts a complete audit with exact coverage', () => {
    expect(readGitHubFleetAudit(write(fixture())).coverage.audited).toBe(1)
  })

  it('fails closed on partial fleet evidence', () => {
    expect(() => readGitHubFleetAudit(write(fixture({ coverage: { expected: 50, audited: 49, errors: 1, complete: false } })))).toThrow('Incomplete')
  })

  it('fails closed when declared and enumerated totals disagree', () => {
    expect(() => readGitHubFleetAudit(write(fixture({ coverage: { expected: 2, audited: 2, errors: 0, complete: true } })))).toThrow('repository count mismatch')
  })
})
