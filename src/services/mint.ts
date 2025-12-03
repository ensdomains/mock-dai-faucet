import { formatUnits, isAddress, parseUnits, type Address } from 'viem'
import { createClients, createFallbackClients } from '../lib/client'
import { ERC20_ABI, TOKENS } from '../lib/config'
import type { Env, MintResult, TokenName } from '../types'

export async function mintToken(
  recipient: Address,
  token: TokenName,
  env: Env
): Promise<MintResult> {
  const tokenConfig = TOKENS[token]
  const mintAmount =
    token === 'usdc' ? env.USDC_MINT_AMOUNT : env.DAI_MINT_AMOUNT
  const amount = parseUnits(mintAmount, tokenConfig.decimals)

  // Try primary RPC first
  try {
    return await executeMint(recipient, tokenConfig, amount, env, false)
  } catch (error) {
    // If primary fails, try fallback
    console.error(`Primary RPC failed for ${token}:`, error)
    return await executeMint(recipient, tokenConfig, amount, env, true)
  }
}

async function executeMint(
  recipient: Address,
  tokenConfig: (typeof TOKENS)[TokenName],
  amount: bigint,
  env: Env,
  useFallback: boolean
): Promise<MintResult> {
  const { publicClient, walletClient } = useFallback
    ? createFallbackClients(env)
    : createClients(env)

  // Send mint transaction
  const txHash = await walletClient.writeContract({
    address: tokenConfig.address,
    abi: ERC20_ABI,
    functionName: 'mint',
    args: [recipient, amount],
    account: walletClient.account!,
    chain: walletClient.chain,
  })

  // Wait for receipt
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  // Get balance
  const balance = await publicClient.readContract({
    address: tokenConfig.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [recipient],
  })

  return {
    txHash,
    balance: formatUnits(balance, tokenConfig.decimals),
  }
}

export function validateRecipient(
  recipient: unknown
): recipient is Address {
  return typeof recipient === 'string' && isAddress(recipient)
}
