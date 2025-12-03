import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from './index'
import type { Env } from './types'

// Mock the mint service
vi.mock('./services/mint', () => ({
  mintToken: vi.fn(),
  validateRecipient: vi.fn(),
}))

import { mintToken, validateRecipient } from './services/mint'

const mockEnv: Env = {
  PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  SEPOLIA_RPC_URL: 'https://rpc.sepolia.org',
  SEPOLIA_RPC_URL_FALLBACK: 'https://rpc2.sepolia.org',
  ALLOWED_ORIGINS: 'localhost:*,*.ens.domains',
  USDC_MINT_AMOUNT: '1000',
  DAI_MINT_AMOUNT: '1000',
}

describe('Hono App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /', () => {
    it('returns status ok', async () => {
      const res = await app.request('/', {}, mockEnv)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ status: 'ok' })
    })
  })

  describe('POST /mint/usdc', () => {
    it('returns 400 for invalid recipient', async () => {
      vi.mocked(validateRecipient).mockReturnValue(false)

      const res = await app.request(
        '/mint/usdc',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: 'invalid' }),
        },
        mockEnv
      )

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid recipient address' })
    })

    it('returns mint result for valid recipient', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)
      vi.mocked(mintToken).mockResolvedValue({
        txHash: '0xabc123',
        balance: '1000',
      })

      const res = await app.request(
        '/mint/usdc',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        txHash: '0xabc123',
        balance: '1000',
      })
      expect(mintToken).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        'usdc',
        mockEnv
      )
    })

    it('returns 500 on mint error', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)
      vi.mocked(mintToken).mockRejectedValue(new Error('RPC timeout'))

      const res = await app.request(
        '/mint/usdc',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'RPC timeout' })
    })
  })

  describe('POST /mint/dai', () => {
    it('returns 400 for invalid recipient', async () => {
      vi.mocked(validateRecipient).mockReturnValue(false)

      const res = await app.request(
        '/mint/dai',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: 'invalid' }),
        },
        mockEnv
      )

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid recipient address' })
    })

    it('returns mint result for valid recipient', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)
      vi.mocked(mintToken).mockResolvedValue({
        txHash: '0xdef456',
        balance: '1000',
      })

      const res = await app.request(
        '/mint/dai',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        txHash: '0xdef456',
        balance: '1000',
      })
      expect(mintToken).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        'dai',
        mockEnv
      )
    })
  })

  describe('POST /mint (both tokens)', () => {
    it('returns 400 for invalid recipient', async () => {
      vi.mocked(validateRecipient).mockReturnValue(false)

      const res = await app.request(
        '/mint',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: 'invalid' }),
        },
        mockEnv
      )

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid recipient address' })
    })

    it('returns both tokens for valid recipient', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)
      vi.mocked(mintToken)
        .mockResolvedValueOnce({ txHash: '0xusdc123', balance: '1000' })
        .mockResolvedValueOnce({ txHash: '0xdai456', balance: '1000' })

      const res = await app.request(
        '/mint',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        usdc: { txHash: '0xusdc123', balance: '1000' },
        dai: { txHash: '0xdai456', balance: '1000' },
      })
    })

    it('returns 500 if either mint fails', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)
      vi.mocked(mintToken)
        .mockResolvedValueOnce({ txHash: '0xusdc123', balance: '1000' })
        .mockRejectedValueOnce(new Error('DAI mint failed'))

      const res = await app.request(
        '/mint',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'DAI mint failed' })
    })
  })

  describe('Origin validation', () => {
    it('blocks disallowed origins on /mint/usdc', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)

      const res = await app.request(
        '/mint/usdc',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://evil.com',
          },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: 'Origin not allowed' })
    })

    it('allows localhost origins', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)
      vi.mocked(mintToken).mockResolvedValue({ txHash: '0x123', balance: '1000' })

      const res = await app.request(
        '/mint/usdc',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'http://localhost:3000',
          },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(200)
    })

    it('allows *.ens.domains origins', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)
      vi.mocked(mintToken).mockResolvedValue({ txHash: '0x123', balance: '1000' })

      const res = await app.request(
        '/mint/usdc',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://app.ens.domains',
          },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(200)
    })

    it('allows requests without origin header', async () => {
      vi.mocked(validateRecipient).mockReturnValue(true)
      vi.mocked(mintToken).mockResolvedValue({ txHash: '0x123', balance: '1000' })

      const res = await app.request(
        '/mint/usdc',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: '0x1234567890123456789012345678901234567890' }),
        },
        mockEnv
      )

      expect(res.status).toBe(200)
    })
  })
})
