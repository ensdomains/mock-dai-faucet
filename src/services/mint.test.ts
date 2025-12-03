import { describe, it, expect } from 'vitest'
import { validateRecipient } from './mint'

describe('validateRecipient', () => {
  describe('valid addresses', () => {
    it('accepts valid checksummed address', () => {
      expect(validateRecipient('0x1234567890123456789012345678901234567890')).toBe(true)
    })

    it('accepts valid lowercase address', () => {
      expect(validateRecipient('0xabcdef1234567890abcdef1234567890abcdef12')).toBe(true)
    })

    it('accepts valid checksummed mixed case address', () => {
      // This is a properly checksummed address (viem validates checksums for mixed case)
      expect(validateRecipient('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')).toBe(true)
    })
  })

  describe('invalid addresses', () => {
    it('rejects address without 0x prefix', () => {
      expect(validateRecipient('1234567890123456789012345678901234567890')).toBe(false)
    })

    it('rejects too short address', () => {
      expect(validateRecipient('0x123456789012345678901234567890123456789')).toBe(false)
    })

    it('rejects too long address', () => {
      expect(validateRecipient('0x12345678901234567890123456789012345678901')).toBe(false)
    })

    it('rejects address with invalid characters', () => {
      expect(validateRecipient('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(validateRecipient('')).toBe(false)
    })

    it('rejects null', () => {
      expect(validateRecipient(null)).toBe(false)
    })

    it('rejects undefined', () => {
      expect(validateRecipient(undefined)).toBe(false)
    })

    it('rejects number', () => {
      expect(validateRecipient(12345)).toBe(false)
    })

    it('rejects object', () => {
      expect(validateRecipient({ address: '0x123' })).toBe(false)
    })

    it('rejects random string', () => {
      expect(validateRecipient('not-an-address')).toBe(false)
    })
  })
})
