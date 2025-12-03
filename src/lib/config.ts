import type { Address } from 'viem'
import type { TokenConfig, TokenName } from '../types'

export const TOKENS: Record<TokenName, TokenConfig> = {
  usdc: {
    address: '0x9028ab8e872af36c30c959a105cb86d1038412ae' as Address,
    decimals: 6,
    name: 'USDC',
  },
  dai: {
    address: '0x6630589c2e6364a96bb7acf0d9d64ac9c1dd3528' as Address,
    decimals: 18,
    name: 'DAI',
  },
}

export const ERC20_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
