import { describe, expect, it } from 'vitest'
import catalog from '@/lib/catalog/repo-catalog.json'

describe('repository catalog', () => {
  it('references the complete GitHub installation inventory', () => {
    expect(catalog.coverage.completeForInstallation).toBe(true)
    expect(catalog.coverage.repositories).toBe(50)
    expect(catalog.repositories).toHaveLength(50)
    expect(new Set(catalog.repositories.map((repo) => repo.fullName)).size).toBe(50)
  })

  it('gives every repository an actionable classification', () => {
    for (const repo of catalog.repositories) {
      expect(repo.category).toBeTruthy()
      expect(repo.purpose).toBeTruthy()
      expect(repo.enables).toBeTruthy()
      expect(repo.decision).toBeTruthy()
      expect(repo.nextAction).toBeTruthy()
      expect(repo.url).toMatch(/^https:\/\/github\.com\//)
    }
  })

  it('covers all declared categories', () => {
    const populated = new Set(catalog.repositories.map((repo) => repo.category))
    expect([...catalog.categories].every((category) => populated.has(category))).toBe(true)
  })
})
