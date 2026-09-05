import { beforeEach, describe, expect, it, vi } from 'vitest'

const fsPromises = vi.hoisted(() => ({
  access: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  default: fsPromises,
  ...fsPromises,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: (_path: string) => (opts: any) => opts,
}))

vi.mock('../../../server/auth-middleware', () => ({
  requireLocalOrAuth: () => true,
}))

describe('jarvis api route', () => {
  async function importRoute() {
    vi.resetModules()
    return import('../jarvis')
  }

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.JARVIS_BRIDGE_DIR
    delete process.env.JARVIS_SIBLING_CANON
    delete process.env.JARVIS_BRIDGE_PROXY_URL
  })

  it('reports degraded bridge-proxy authority instead of 503 unavailable when direct mounts are missing', async () => {
    fsPromises.access.mockRejectedValue(new Error('missing'))
    fsPromises.readFile.mockRejectedValue(new Error('missing'))
    fsPromises.readdir.mockRejectedValue(new Error('missing'))
    fsPromises.writeFile.mockRejectedValue(new Error('read-only or missing'))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/health')) return Response.json({ ok: true, store_dir: '/opt/data/runtime-bridge' })
        if (url.includes('/snapshot')) {
          return Response.json({
            inbox: [{ id: 'in-1', created_at: '2026-09-05T17:00:00.000Z', updated_at: '2026-09-05T17:01:00.000Z', message: { kind: 'request', status: 'new', text: 'hello' } }],
            outbox: [{ id: 'out-1', created_at: '2026-09-05T17:02:00.000Z', updated_at: '2026-09-05T17:03:00.000Z', message: { kind: 'reply', status: 'processed', text: 'world' } }],
          })
        }
        return Response.json({ ok: false }, { status: 404 })
      }),
    )

    const mod = await importRoute()
    const status = await mod.getJarvisStatus()
    expect(status.status).toBe('degraded')
    expect(status.authority).toBe('bridge_proxy')
    expect(status.authorityEvidence.join(' ')).toContain('health=ok')
    expect(status.capabilitiesSnapshot?.runtime.health).toBe('bridge-proxy-ok')
    expect(status.inbox[0]?.name).toContain('in-1')

    const response = await (mod.Route as any).server.handlers.GET({ request: new Request('http://localhost/api/jarvis') })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: false, status: 'degraded', authority: 'bridge_proxy' })
  })

  it('keeps mounted canon/bridge as online authority when both read-only paths expose useful information', async () => {
    fsPromises.access.mockResolvedValue(undefined)
    fsPromises.readFile.mockImplementation(async (target: string) => {
      if (target.endsWith('jarvis-capabilities.json')) {
        return JSON.stringify({
          checkedAt: '2026-09-05T17:00:00.000Z',
          version: 'OpenClaw live',
          channel: 'canon',
          update: 'ok',
          image: 'openclaw',
          runtime: { status: 'running', health: 'healthy', startedAt: '2026-09-05T16:00:00.000Z' },
          fork: { image: 'openclaw', sourceLabel: 'live', docs: 'docs', enabledPlugins: 1, totalPlugins: 2, stockRoot: '/plugins', codexPlugin: 'enabled' },
          modelsSummary: [],
          memorySummary: [],
          communicationSummary: [],
          capabilities: [],
          limitations: [],
        })
      }
      return '# Hermes ↔ Jarvis canon\nread-only sibling contract'
    })
    fsPromises.readdir.mockResolvedValue([])
    fsPromises.writeFile.mockRejectedValue(new Error('read-only'))
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false }, { status: 404 })))

    const mod = await importRoute()
    const status = await mod.getJarvisStatus()
    expect(status.ok).toBe(true)
    expect(status.status).toBe('online')
    expect(status.authority).toBe('mounted_bridge')
    expect(fsPromises.access.mock.calls.every((call) => call[1] !== undefined)).toBe(true)
    expect(status.siblingCanonPreview).toContain('sibling contract')
    expect(status.capabilitiesSnapshot?.runtime.health).toBe('healthy')
  })

  it('does not report online when mounts exist but the app cannot read useful Jarvis information', async () => {
    fsPromises.access.mockResolvedValue(undefined)
    fsPromises.readFile.mockRejectedValue(new Error('permission denied'))
    fsPromises.readdir.mockResolvedValue([])
    fsPromises.writeFile.mockRejectedValue(new Error('read-only'))
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false }, { status: 404 })))

    const mod = await importRoute()
    const status = await mod.getJarvisStatus()
    expect(status.ok).toBe(false)
    expect(status.status).toBe('degraded')
    expect(status.authority).toBe('unavailable')
    expect(status.siblingCanonPreview).toBe('')
  })
})
