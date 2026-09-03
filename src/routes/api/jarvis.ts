import fs from 'node:fs/promises'
import path from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import { requireLocalOrAuth } from '../../server/auth-middleware'

type BridgeEntry = {
  name: string
  kind: 'file' | 'directory' | 'other'
  modifiedAt: string | null
  size: number | null
}

type CapabilityGroup = {
  group: string
  items: Array<string>
}

type JarvisCapabilitiesSnapshot = {
  checkedAt: string
  version: string
  channel: string
  update: string
  image: string
  runtime: { status: string; health: string; startedAt: string }
  fork: {
    image: string
    sourceLabel: string
    docs: string
    enabledPlugins: number | null
    totalPlugins: number | null
    stockRoot: string
    codexPlugin: string
  }
  modelsSummary: Array<string>
  memorySummary: Array<string>
  communicationSummary: Array<string>
  capabilities: Array<CapabilityGroup>
  limitations: Array<string>
}

type JarvisStatusResponse = {
  ok: boolean
  status: 'online' | 'degraded' | 'unavailable'
  checkedAt: string
  bridgeDir: string
  siblingCanonPath: string
  bridgeReadable: boolean
  siblingCanonReadable: boolean
  readOnly: boolean
  siblingCanonPreview: string
  inbox: Array<BridgeEntry>
  outbox: Array<BridgeEntry>
  capabilitiesSnapshot: JarvisCapabilitiesSnapshot | null
  error?: string
}

const DEFAULT_BRIDGE_DIR = '/mnt/jarvis/bridge/hermes-jarvis'
const DEFAULT_SIBLING_CANON = '/mnt/jarvis/workspace/HERMES-JARVIS-SIBLING.md'

async function canRead(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function readPreview(target: string): Promise<string> {
  try {
    const raw = await fs.readFile(target, 'utf8')
    return raw.split('\n').slice(0, 18).join('\n').trim()
  } catch {
    return ''
  }
}

async function readCapabilitiesSnapshot(bridgeDir: string): Promise<JarvisCapabilitiesSnapshot | null> {
  try {
    const raw = await fs.readFile(path.join(bridgeDir, 'status', 'jarvis-capabilities.json'), 'utf8')
    return JSON.parse(raw) as JarvisCapabilitiesSnapshot
  } catch {
    return null
  }
}

async function listEntries(target: string): Promise<Array<BridgeEntry>> {
  try {
    const entries = await fs.readdir(target, { withFileTypes: true })
    const rows = await Promise.all(
      entries.slice(0, 12).map(async (entry) => {
        const fullPath = path.join(target, entry.name)
        try {
          const stat = await fs.stat(fullPath)
          return {
            name: entry.name,
            kind: entry.isFile() ? 'file' : entry.isDirectory() ? 'directory' : 'other',
            modifiedAt: stat.mtime.toISOString(),
            size: entry.isFile() ? stat.size : null,
          } satisfies BridgeEntry
        } catch {
          return {
            name: entry.name,
            kind: entry.isFile() ? 'file' : entry.isDirectory() ? 'directory' : 'other',
            modifiedAt: null,
            size: null,
          } satisfies BridgeEntry
        }
      }),
    )
    return rows.sort((a, b) => (b.modifiedAt ?? '').localeCompare(a.modifiedAt ?? ''))
  } catch {
    return []
  }
}

async function isReadOnly(bridgeDir: string): Promise<boolean> {
  const probe = path.join(bridgeDir, `.workspace-write-probe-${process.pid}`)
  try {
    await fs.writeFile(probe, 'probe', { flag: 'wx' })
    await fs.unlink(probe).catch(() => undefined)
    return false
  } catch {
    return true
  }
}

export const Route = createFileRoute('/api/jarvis')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireLocalOrAuth(request)) {
          return Response.json(
            {
              ok: false,
              status: 'unavailable',
              checkedAt: new Date().toISOString(),
              bridgeDir: '',
              siblingCanonPath: '',
              bridgeReadable: false,
              siblingCanonReadable: false,
              readOnly: true,
              siblingCanonPreview: '',
              inbox: [],
              outbox: [],
              capabilitiesSnapshot: null,
              error: 'Authentication required',
            } satisfies JarvisStatusResponse,
            { status: 401 },
          )
        }

        const bridgeDir = process.env.JARVIS_BRIDGE_DIR || DEFAULT_BRIDGE_DIR
        const siblingCanonPath = process.env.JARVIS_SIBLING_CANON || DEFAULT_SIBLING_CANON
        const [bridgeReadable, siblingCanonReadable, readOnly, siblingCanonPreview, inbox, outbox, capabilitiesSnapshot] = await Promise.all([
          canRead(bridgeDir),
          canRead(siblingCanonPath),
          isReadOnly(bridgeDir),
          readPreview(siblingCanonPath),
          listEntries(path.join(bridgeDir, 'inbox')),
          listEntries(path.join(bridgeDir, 'outbox')),
          readCapabilitiesSnapshot(bridgeDir),
        ])
        const ok = bridgeReadable && siblingCanonReadable && readOnly

        return Response.json(
          {
            ok,
            status: ok ? 'online' : bridgeReadable || siblingCanonReadable ? 'degraded' : 'unavailable',
            checkedAt: new Date().toISOString(),
            bridgeDir,
            siblingCanonPath,
            bridgeReadable,
            siblingCanonReadable,
            readOnly,
            siblingCanonPreview,
            inbox,
            outbox,
            capabilitiesSnapshot,
            ...(ok ? {} : { error: 'Jarvis bridge/canon is not fully readable or not read-only' }),
          } satisfies JarvisStatusResponse,
          { status: ok ? 200 : 503 },
        )
      },
    },
  },
})
