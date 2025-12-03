import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import type { Env } from '../types'

export function createClients(env: Env) {
  const account = privateKeyToAccount(env.PRIVATE_KEY as Hex)

  const transport = fallback([
    http(env.SEPOLIA_RPC_URL, { timeout: 30_000 }),
    http(env.SEPOLIA_RPC_URL_FALLBACK, { timeout: 30_000 }),
  ])

  const publicClient = createPublicClient({
    chain: sepolia,
    transport,
  })

  const walletClient = createWalletClient({
    chain: sepolia,
    transport,
    account,
  })

  return { publicClient, walletClient }
}
