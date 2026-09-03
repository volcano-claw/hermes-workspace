// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { OperatorDomainAccessRegistryCard } from './operator-domain-access-registry-card'
import type { WorkspaceOperatorDomainAccessRegistry } from '@/server/operator/domain-access-registry'

const registry: WorkspaceOperatorDomainAccessRegistry = {
  mode: 'workspace_operator_domain_access_registry_v1',
  readOnly: true,
  secretsExposed: false,
  registryPath: '/opt/data/hermes-context/DOMAIN-API-ACCESS-REGISTRY.md',
  checkedAt: '2026-09-02T12:00:00.000Z',
  summary: 'Domaines/API maison inventoriés sans secrets.',
  counts: {
    LIVE: 2,
    AUTH_PROTECTED: 1,
    DEGRADED: 1,
    TLS_ERROR: 1,
    RESERVED: 0,
    INVENTORY_NEEDED: 1,
  },
  entries: [
    {
      id: 'hermes-workspace',
      label: 'Hermes Workspace',
      url: 'https://hermes.heiries.fr/',
      role: 'Surface humaine active: Workspace, Operator, missions, preuves, GO.',
      project: 'Hermes',
      status: 'LIVE',
      accessModel: 'authenticated',
      evidence: 'HTTP 200 on 2026-09-02; /operator live verified.',
      actionLabel: 'Ouvrir Hermes Workspace',
      actionHref: 'https://hermes.heiries.fr/operator',
      goGate: 'Workspace recreate/push/provider/secrets require explicit GO.',
    },
    {
      id: 'dbm-cockpit',
      label: 'DBM Cockpit',
      url: 'https://cockpit.directbookingmanager.com/login',
      role: 'Vraie surface métier DBM: Workspace, Super Admin, Outreach, Pipeline.',
      project: 'DBM',
      status: 'LIVE',
      accessModel: 'authenticated',
      evidence: 'HTTP 200 on /login.',
      actionLabel: 'Ouvrir DBM Cockpit',
      actionHref: 'https://cockpit.directbookingmanager.com/login',
      goGate: 'DBM writes/email/Sender/AgentMail/Stripe require explicit GO.',
    },
  ],
}

afterEach(() => cleanup())

describe('OperatorDomainAccessRegistryCard', () => {
  it('renders useful access links and guardrails without credentials', () => {
    render(<OperatorDomainAccessRegistryCard registry={registry} />)

    expect(screen.getByRole('region', { name: 'Operator Domain/API Access Registry' })).toBeTruthy()
    expect(screen.getByText('Domaines, API et accès maison')).toBeTruthy()
    expect(screen.getByText('No secrets')).toBeTruthy()
    expect(screen.getByText('Hermes Workspace')).toBeTruthy()
    expect(screen.getByText('DBM Cockpit')).toBeTruthy()
    expect(screen.getByText('Vraie surface métier DBM: Workspace, Super Admin, Outreach, Pipeline.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ouvrir Hermes Workspace' }).getAttribute('href')).toBe('https://hermes.heiries.fr/operator')
    expect(screen.getByRole('link', { name: 'Ouvrir DBM Cockpit' }).getAttribute('href')).toBe('https://cockpit.directbookingmanager.com/login')

    const text = document.body.textContent.toLowerCase()
    expect(text).not.toContain('password')
    expect(text).not.toContain('raw credential marker')
    expect(text).not.toContain('raw token marker')
    expect(text).not.toContain('raw secret marker')
  })
})
