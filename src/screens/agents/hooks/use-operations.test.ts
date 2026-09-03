import { describe, expect, it } from 'vitest'

import { getProfileDescription, getProfileDisplayName } from './use-operations'

describe('operations profile display helpers', () => {
  it('labels the default profile as the primary Hermes identity', () => {
    expect(getProfileDisplayName('default')).toBe('Hermes — Papa')
    expect(getProfileDescription('default')).toBe('Moi, Hermes principal — profil default du gateway actif')
  })

  it('keeps named assistant profiles unchanged', () => {
    expect(getProfileDisplayName('builder')).toBe('builder')
    expect(getProfileDescription('builder', 'Scoped implementation')).toBe('Scoped implementation')
  })
})
