import { describe, expect, it, vi } from 'vitest'
import { getSystemCockpitSnapshot } from './system-cockpit'

const okFetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch

describe('system-cockpit', () => {
  it('keeps Workspace as a read-only one-Hermes cockpit', async () => {
    const snapshot = await getSystemCockpitSnapshot({
      now: new Date('2026-09-03T19:30:00.000Z'),
      fetchImpl: okFetch,
      hermesHome: '/missing/hermes-home',
      knowledgeDir: '/missing/vault',
      tasksHome: '/missing/tasks',
      contextRoot: '/missing/context',
      canonicalHermesHome: '/missing/canonical-home',
    })

    expect(snapshot.mode).toBe('workspace_system_cockpit_v1')
    expect(snapshot.readOnly).toBe(true)
    expect(snapshot.identity.principle).toBe('one_hermes_multiple_interfaces')
    expect(snapshot.boundaries.map((boundary) => boundary.id)).toContain('writes')
    expect(snapshot.connections.map((connection) => connection.id)).toEqual(
      expect.arrayContaining([
        'hermes-core',
        'memory-vault',
        'tasks-kanban',
        'jarvis',
        'mutual-care',
        'operator-api',
        'swarm',
        'terminal',
      ]),
    )
    expect(snapshot.connections.find((connection) => connection.id === 'terminal')?.detail).toContain('conteneur hermes-workspace')
  })
})
