import { describe, expect, it } from 'vitest'
import { getOperatorDomainAccessRegistry } from './domain-access-registry'

describe('getOperatorDomainAccessRegistry', () => {
  it('lists Heiries and DBM access surfaces without exposing credentials', () => {
    const registry = getOperatorDomainAccessRegistry()

    expect(registry.mode).toBe('workspace_operator_domain_access_registry_v1')
    expect(registry.readOnly).toBe(true)
    expect(registry.secretsExposed).toBe(false)
    expect(registry.registryPath).toBe('/opt/data/hermes-context/DOMAIN-API-ACCESS-REGISTRY.md')
    expect(registry.entries.length).toBeGreaterThanOrEqual(10)

    expect(registry.entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        'hermes-workspace',
        'preview-hub',
        'operator-heiries',
        'api-heiries-volcano-mobile',
        'dbm-saas',
        'dbm-cockpit',
      ]),
    )

    const hermesWorkspace = registry.entries.find((entry) => entry.id === 'hermes-workspace')
    expect(hermesWorkspace?.status).toBe('LIVE')
    expect(hermesWorkspace?.actionHref).toBe('https://hermes.heiries.fr/operator')

    const api = registry.entries.find((entry) => entry.id === 'api-heiries-volcano-mobile')
    expect(api?.status).toBe('DEGRADED')
    expect(api?.evidence).toContain('HTTP 502')

    const operator = registry.entries.find((entry) => entry.id === 'operator-heiries')
    expect(operator?.status).toBe('TLS_ERROR')
    expect(operator?.goGate).toContain('explicit GO')

    const dbmCockpit = registry.entries.find((entry) => entry.id === 'dbm-cockpit')
    expect(dbmCockpit?.role).toContain('Vraie surface métier DBM')
    expect(dbmCockpit?.actionHref).toBe('https://cockpit.directbookingmanager.com/login')

    const serialized = JSON.stringify(registry).toLowerCase()
    expect(serialized).not.toContain('password')
    expect(serialized).not.toContain('raw token marker')
    expect(serialized).not.toContain('raw secret marker')
    expect(serialized).not.toContain('raw credential marker')
  })
})
