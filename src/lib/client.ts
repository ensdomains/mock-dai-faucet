import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Hex,
  type HttpTransport,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import type { Env } from '../types'

interface Clients {
  publicClient: PublicClient<HttpTransport, Chain>
  walletClient: WalletClient<HttpTransport, Chain>
}

export function createClients(env: Env): Clients {
  const account = privateKeyToAccount(env.PRIVATE_KEY as Hex)

  const transport = http(env.SEPOLIA_RPC_URL, {
    timeout: 30_000,
    retryCount: 0,
  })

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

export function createFallbackClients(env: Env): Clients {
  const account = privateKeyToAccount(env.PRIVATE_KEY as Hex)

  const transport = http(env.SEPOLIA_RPC_URL_FALLBACK, {
    timeout: 30_000,
    retryCount: 0,
  })

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
