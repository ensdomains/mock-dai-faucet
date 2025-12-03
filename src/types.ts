import type { Address, Hex } from 'viem'

export type TokenName = 'usdc' | 'dai'

export interface TokenConfig {
  address: Address
  decimals: number
  name: string
}

export interface MintResult {
  txHash: Hex
  balance: string
}

export interface Env {
  PRIVATE_KEY: string
  SEPOLIA_RPC_URL: string
  SEPOLIA_RPC_URL_FALLBACK?: string
  ALLOWED_ORIGINS: string
  USDC_MINT_AMOUNT: string
  DAI_MINT_AMOUNT: string
}
