import { describe, it, expect } from 'vitest'
import { matchesPattern } from './origin'

describe('matchesPattern', () => {
  describe('exact matches', () => {
    it('matches exact origin', () => {
      expect(matchesPattern('localhost:3000', 'localhost:3000')).toBe(true)
    })

    it('rejects non-matching origin', () => {
      expect(matchesPattern('localhost:3000', 'localhost:8080')).toBe(false)
    })
  })

  describe('wildcard port matching', () => {
    it('matches any port with localhost:*', () => {
      expect(matchesPattern('localhost:3000', 'localhost:*')).toBe(true)
      expect(matchesPattern('localhost:8080', 'localhost:*')).toBe(true)
      expect(matchesPattern('localhost:443', 'localhost:*')).toBe(true)
    })

    it('rejects different host with port wildcard', () => {
      expect(matchesPattern('example.com:3000', 'localhost:*')).toBe(false)
    })
  })

  describe('wildcard subdomain matching', () => {
    it('matches subdomains with *.domain.com', () => {
      expect(matchesPattern('app.ens.domains', '*.ens.domains')).toBe(true)
      expect(matchesPattern('test.ens.domains', '*.ens.domains')).toBe(true)
      expect(matchesPattern('sub.app.ens.domains', '*.ens.domains')).toBe(true)
    })

    it('rejects root domain with subdomain wildcard', () => {
      expect(matchesPattern('ens.domains', '*.ens.domains')).toBe(false)
    })

    it('rejects different domain', () => {
      expect(matchesPattern('app.other.com', '*.ens.domains')).toBe(false)
    })
  })

  describe('special regex characters', () => {
    it('escapes dots correctly', () => {
      expect(matchesPattern('localhostX3000', 'localhost.3000')).toBe(false)
      expect(matchesPattern('localhost.3000', 'localhost.3000')).toBe(true)
    })

    it('handles patterns with special chars', () => {
      expect(matchesPattern('test.example.com', 'test.example.com')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles empty strings', () => {
      expect(matchesPattern('', '')).toBe(true)
      expect(matchesPattern('localhost', '')).toBe(false)
    })

    it('handles pattern with only wildcard', () => {
      expect(matchesPattern('anything', '*')).toBe(true)
      expect(matchesPattern('localhost:3000', '*')).toBe(true)
    })
  })
})
