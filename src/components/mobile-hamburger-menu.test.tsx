import { describe, expect, it } from 'vitest'
import { MOBILE_HAMBURGER_NAV_ITEMS } from './mobile-hamburger-menu'

describe('mobile hamburger system navigation', () => {
  it('exposes dedicated System and Operator entries', () => {
    const system = MOBILE_HAMBURGER_NAV_ITEMS.find((entry) => entry.id === 'system')
    const operator = MOBILE_HAMBURGER_NAV_ITEMS.find((entry) => entry.id === 'operator')

    expect(system?.label).toBe('System')
    expect(system?.to).toBe('/system')
    expect(system?.match('/system')).toBe(true)
    expect(system?.match('/system/details')).toBe(true)

    expect(operator?.label).toBe('Operator')
    expect(operator?.to).toBe('/operator')
    expect(operator?.match('/operator')).toBe(true)
    expect(operator?.match('/operator/details')).toBe(true)
  })
})
