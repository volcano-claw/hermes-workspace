import fs from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
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

type BridgeSnapshotItem = {
  id?: string
  created_at?: string
  updated_at?: string
  queue?: string
  message?: { kind?: string; status?: string; from?: string; to?: string; text?: string }
}

type BridgeProxySnapshot = {
  inbox?: Array<BridgeSnapshotItem>
  outbox?: Array<BridgeSnapshotItem>
}

type BridgeProxyState = {
  ok: boolean
  url: string
  health: Record<string, unknown> | null
  snapshot: BridgeProxySnapshot | null
}

type JarvisAuthority = 'mounted_bridge' | 'bridge_proxy' | 'unavailable'

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
  authority: JarvisAuthority
  authorityEvidence: Array<string>
  bridgeProxyUrl?: string
  error?: string
}

const DEFAULT_BRIDGE_DIR = '/mnt/jarvis/bridge/hermes-jarvis'
const DEFAULT_SIBLING_CANON = '/mnt/jarvis/workspace/HERMES-JARVIS-SIBLING.md'
const DEFAULT_BRIDGE_PROXY_URL = 'http://hermes-jarvis-bridge-proxy:8766'

async function canRead(target: string): Promise<boolean> {
  try {
    // local fork carry: Jarvis must be marked connected only when the
    // Workspace app user can actually read mounted sibling evidence, not only
    // when the path exists. F_OK produced false "online" panels with empty
    // Jarvis information when gosu dropped supplementary groups.
    await fs.access(target, fsConstants.R_OK)
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

async function fetchJson(url: string): Promise<{ ok: boolean; json: Record<string, unknown> | null }> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_500) })
    const json = (await response.json().catch(() => null)) as Record<string, unknown> | null
    return { ok: response.ok, json }
  } catch {
    return { ok: false, json: null }
  }
}

async function readBridgeProxy(proxyUrl: string): Promise<BridgeProxyState> {
  const base = proxyUrl.replace(/\/+$/, '')
  const [health, snapshot] = await Promise.all([fetchJson(`${base}/health`), fetchJson(`${base}/snapshot?limit=12`)])
  return {
    ok: health.ok && health.json?.ok === true,
    url: base,
    health: health.json,
    snapshot: snapshot.ok ? (snapshot.json as BridgeProxySnapshot | null) : null,
  }
}

function proxyItemsToEntries(items: Array<BridgeSnapshotItem> | undefined): Array<BridgeEntry> {
  return (items ?? []).slice(0, 12).map((item, index) => {
    const message = item.message
    const label = [item.id || `message-${index + 1}`, message?.kind, message?.status].filter(Boolean).join(' · ')
    return {
      name: label || `message-${index + 1}`,
      kind: 'file',
      modifiedAt: item.updated_at ?? item.created_at ?? null,
      size: message?.text ? message.text.length : null,
    }
  })
}

function authorityBoundSnapshot(now: string, proxy: BridgeProxyState): JarvisCapabilitiesSnapshot {
  return {
    checkedAt: now,
    version: 'OpenClaw / Jarvis authority-bound',
    channel: 'read-only bridge proxy',
    update: 'Bridge proxy is reachable, but direct sibling canon mounts are not active in this Workspace container.',
    image: 'openclaw health is Docker-authoritative; Workspace has no docker.sock by design',
    runtime: { status: proxy.ok ? 'reachable' : 'unknown', health: proxy.ok ? 'bridge-proxy-ok' : 'authority-bound', startedAt: '' },
    fork: {
      image: 'authority-bound',
      sourceLabel: 'OpenClaw live state requires mounted canon or host/Docker authority',
      docs: 'HERMES-JARVIS-SIBLING.md mount expected read-only',
      enabledPlugins: null,
      totalPlugins: null,
      stockRoot: 'unavailable from current container mounts',
      codexPlugin: 'not asserted without canon mount',
    },
    modelsSummary: ['Not asserted from Workspace: no provider/auth mutation and no secret reads.'],
    memorySummary: ['Bridge proxy can expose Hermes ↔ Jarvis queue metadata read-only when reachable.'],
    communicationSummary: [`Bridge proxy: ${proxy.ok ? 'reachable' : 'unreachable'} at ${proxy.url}`],
    capabilities: [
      { group: 'Authority-bound evidence', items: ['Workspace can query the live bridge proxy read-only.', 'Direct Jarvis canon/bridge mounts are missing in the current container instance.', 'OpenClaw Docker health is not asserted from this route without docker.sock or canon mount.'] },
    ],
    limitations: [
      'No OpenClaw restart/recreate/provider/auth change was performed.',
      'Direct sibling-canon content remains unavailable until the read-only mounts are active.',
      'This is an honest degraded state, not a false unavailable state caused only by missing /mnt/jarvis paths.',
    ],
  }
}

export async function getJarvisStatus(): Promise<JarvisStatusResponse> {
  const now = new Date().toISOString()
  const bridgeDir = process.env.JARVIS_BRIDGE_DIR || DEFAULT_BRIDGE_DIR
  const siblingCanonPath = process.env.JARVIS_SIBLING_CANON || DEFAULT_SIBLING_CANON
  const bridgeProxyUrl = process.env.JARVIS_BRIDGE_PROXY_URL || DEFAULT_BRIDGE_PROXY_URL
  const [bridgeReadable, siblingCanonReadable, readOnly, siblingCanonPreview, inbox, outbox, capabilitiesSnapshot, bridgeProxy] = await Promise.all([
    canRead(bridgeDir),
    canRead(siblingCanonPath),
    isReadOnly(bridgeDir),
    readPreview(siblingCanonPath),
    listEntries(path.join(bridgeDir, 'inbox')),
    listEntries(path.join(bridgeDir, 'outbox')),
    readCapabilitiesSnapshot(bridgeDir),
    readBridgeProxy(bridgeProxyUrl),
  ])

  const hasUsefulMountedInfo = Boolean(siblingCanonPreview || capabilitiesSnapshot || inbox.length || outbox.length)
  const mountedOk = bridgeReadable && siblingCanonReadable && readOnly && hasUsefulMountedInfo
  if (mountedOk) {
    return {
      ok: true,
      status: 'online',
      checkedAt: now,
      bridgeDir,
      siblingCanonPath,
      bridgeReadable,
      siblingCanonReadable,
      readOnly,
      siblingCanonPreview,
      inbox,
      outbox,
      capabilitiesSnapshot,
      authority: 'mounted_bridge',
      authorityEvidence: [`canon=${siblingCanonPath}`, `bridge=${bridgeDir}`, 'read_only=true'],
      bridgeProxyUrl,
    }
  }

  if (bridgeProxy.ok) {
    return {
      ok: false,
      status: 'degraded',
      checkedAt: now,
      bridgeDir,
      siblingCanonPath,
      bridgeReadable,
      siblingCanonReadable,
      readOnly: true,
      siblingCanonPreview: siblingCanonPreview || 'Sibling canon mount is not readable in this Workspace container; reporting bridge-proxy authority instead.',
      inbox: inbox.length ? inbox : proxyItemsToEntries(bridgeProxy.snapshot?.inbox),
      outbox: outbox.length ? outbox : proxyItemsToEntries(bridgeProxy.snapshot?.outbox),
      capabilitiesSnapshot: capabilitiesSnapshot ?? authorityBoundSnapshot(now, bridgeProxy),
      authority: 'bridge_proxy',
      authorityEvidence: [
        `bridge_proxy=${bridgeProxy.url} health=ok`,
        `canon_readable=${siblingCanonReadable}`,
        `bridge_mount_readable=${bridgeReadable}`,
        'direct OpenClaw health remains host/Docker-authority-bound until read-only mounts are active',
      ],
      bridgeProxyUrl,
    }
  }

  return {
    ok: false,
    status: bridgeReadable || siblingCanonReadable ? 'degraded' : 'unavailable',
    checkedAt: now,
    bridgeDir,
    siblingCanonPath,
    bridgeReadable,
    siblingCanonReadable,
    readOnly,
    siblingCanonPreview,
    inbox,
    outbox,
    capabilitiesSnapshot,
    authority: 'unavailable',
    authorityEvidence: [`canon_readable=${siblingCanonReadable}`, `bridge_mount_readable=${bridgeReadable}`, `bridge_proxy=${bridgeProxy.url} health=unreachable`],
    bridgeProxyUrl,
    error: 'Jarvis bridge/canon and bridge proxy are not readable from Workspace',
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
              authority: 'unavailable',
              authorityEvidence: ['Authentication required'],
              error: 'Authentication required',
            } satisfies JarvisStatusResponse,
            { status: 401 },
          )
        }

        const status = await getJarvisStatus()
        return Response.json(status, { status: status.authority === 'unavailable' ? 503 : 200 })
      },
    },
  },
})
