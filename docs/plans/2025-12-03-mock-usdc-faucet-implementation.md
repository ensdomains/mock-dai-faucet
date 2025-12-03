# Mock USDC Faucet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Cloudflare Worker that mints mock USDC and DAI tokens on Sepolia testnet via HTTP API.

**Architecture:** Hono web framework handles routing with origin validation middleware. A reusable mint service wraps viem for blockchain interactions with RPC fallback. Three endpoints share the same minting logic.

**Tech Stack:** Bun, Hono, viem, Cloudflare Workers, wrangler

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `wrangler.toml`

**Step 1: Initialize package.json**

```json
{
  "name": "mock-usdc-faucet",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "viem": "^2.21.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "typescript": "^5.7.0",
    "wrangler": "^3.93.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"],
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create wrangler.toml**

```toml
name = "mock-usdc-faucet"
main = "src/index.ts"
compatibility_date = "2024-11-01"

[vars]
# Non-secret defaults (override in dashboard or .dev.vars)
USDC_MINT_AMOUNT = "1000"
DAI_MINT_AMOUNT = "1000"

# Secrets (set via wrangler secret put):
# - PRIVATE_KEY
# - SEPOLIA_RPC_URL
# - SEPOLIA_RPC_URL_FALLBACK
# - ALLOWED_ORIGINS
```

**Step 4: Install dependencies**

Run: `bun install`
Expected: Dependencies installed successfully

**Step 5: Commit**

```bash
git add package.json tsconfig.json wrangler.toml bun.lockb
git commit -m "chore: initialize project with hono, viem, wrangler"
```

---

## Task 2: Types and Configuration

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/config.ts`

**Step 1: Create shared types**

Create `src/types.ts`:

```typescript
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
  SEPOLIA_RPC_URL_FALLBACK: string
  ALLOWED_ORIGINS: string
  USDC_MINT_AMOUNT: string
  DAI_MINT_AMOUNT: string
}
```

**Step 2: Create config with token addresses and ABI**

Create `src/lib/config.ts`:

```typescript
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
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types.ts src/lib/config.ts
git commit -m "feat: add types and token configuration"
```

---

## Task 3: Viem Client with RPC Fallback

**Files:**
- Create: `src/lib/client.ts`

**Step 1: Create client factory with fallback**

Create `src/lib/client.ts`:

```typescript
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
  walletClient: WalletClient
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
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/client.ts
git commit -m "feat: add viem client factory with fallback support"
```

---

## Task 4: Origin Validation Middleware

**Files:**
- Create: `src/middleware/origin.ts`

**Step 1: Create origin middleware with wildcard matching**

Create `src/middleware/origin.ts`:

```typescript
import type { Context, Next } from 'hono'
import type { Env } from '../types'

function matchesPattern(origin: string, pattern: string): boolean {
  // Convert wildcard pattern to regex
  // *.example.com -> matches any subdomain
  // localhost:* -> matches any port
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
    .replace(/\*/g, '.*') // Convert * to .*

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(origin)
}

export function originMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header('origin')

    // Allow requests without origin (e.g., curl, server-to-server)
    if (!origin) {
      return next()
    }

    const allowedOrigins = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())

    const isAllowed = allowedOrigins.some((pattern) => {
      // Try matching against the full origin
      if (matchesPattern(origin, pattern)) return true

      // Also try matching against origin without protocol
      const originWithoutProtocol = origin.replace(/^https?:\/\//, '')
      return matchesPattern(originWithoutProtocol, pattern)
    })

    if (!isAllowed) {
      return c.json({ error: 'Origin not allowed' }, 403)
    }

    return next()
  }
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/middleware/origin.ts
git commit -m "feat: add origin validation middleware with wildcard support"
```

---

## Task 5: Mint Service

**Files:**
- Create: `src/services/mint.ts`

**Step 1: Create reusable mint service**

Create `src/services/mint.ts`:

```typescript
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
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/mint.ts
git commit -m "feat: add mint service with RPC fallback"
```

---

## Task 6: Hono App and Routes

**Files:**
- Create: `src/index.ts`

**Step 1: Create Hono app with all routes**

Create `src/index.ts`:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { originMiddleware } from './middleware/origin'
import { mintToken, validateRecipient } from './services/mint'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// Enable CORS (actual origin check is in middleware)
app.use('*', cors())

// Origin validation
app.use('/mint/*', originMiddleware())
app.use('/mint', originMiddleware())

// Health check
app.get('/', (c) => c.json({ status: 'ok' }))

// Mint USDC only
app.post('/mint/usdc', async (c) => {
  const body = await c.req.json<{ recipient?: string }>()

  if (!validateRecipient(body.recipient)) {
    return c.json({ error: 'Invalid recipient address' }, 400)
  }

  try {
    const result = await mintToken(body.recipient, 'usdc', c.env)
    return c.json(result)
  } catch (error) {
    console.error('Mint USDC error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Mint failed' },
      500
    )
  }
})

// Mint DAI only
app.post('/mint/dai', async (c) => {
  const body = await c.req.json<{ recipient?: string }>()

  if (!validateRecipient(body.recipient)) {
    return c.json({ error: 'Invalid recipient address' }, 400)
  }

  try {
    const result = await mintToken(body.recipient, 'dai', c.env)
    return c.json(result)
  } catch (error) {
    console.error('Mint DAI error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Mint failed' },
      500
    )
  }
})

// Mint both tokens
app.post('/mint', async (c) => {
  const body = await c.req.json<{ recipient?: string }>()

  if (!validateRecipient(body.recipient)) {
    return c.json({ error: 'Invalid recipient address' }, 400)
  }

  try {
    const [usdc, dai] = await Promise.all([
      mintToken(body.recipient, 'usdc', c.env),
      mintToken(body.recipient, 'dai', c.env),
    ])

    return c.json({ usdc, dai })
  } catch (error) {
    console.error('Mint both error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Mint failed' },
      500
    )
  }
})

export default app
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add hono routes for minting endpoints"
```

---

## Task 7: Local Development Setup

**Files:**
- Create: `.dev.vars.example`
- Create: `.gitignore`

**Step 1: Create example dev vars file**

Create `.dev.vars.example`:

```
PRIVATE_KEY=0x_your_private_key_here
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
SEPOLIA_RPC_URL_FALLBACK=https://sepolia.infura.io/v3/your-key
ALLOWED_ORIGINS=localhost:*,*.ens.domains
USDC_MINT_AMOUNT=1000
DAI_MINT_AMOUNT=1000
```

**Step 2: Create .gitignore**

Create `.gitignore`:

```
node_modules/
.dev.vars
.wrangler/
dist/
```

**Step 3: Commit**

```bash
git add .dev.vars.example .gitignore
git commit -m "chore: add dev vars example and gitignore"
```

---

## Task 8: Test Locally

**Step 1: Create .dev.vars from example**

Copy `.dev.vars.example` to `.dev.vars` and fill in real values.

**Step 2: Start dev server**

Run: `bun run dev`
Expected: Server starts on http://localhost:8787

**Step 3: Test health endpoint**

Run: `curl http://localhost:8787/`
Expected: `{"status":"ok"}`

**Step 4: Test mint endpoint (requires funded wallet)**

Run:
```bash
curl -X POST http://localhost:8787/mint/usdc \
  -H "Content-Type: application/json" \
  -d '{"recipient": "0xYourTestAddress"}'
```
Expected: `{"txHash":"0x...","balance":"1000"}`

---

## Task 9: Deploy to Cloudflare

**Step 1: Set secrets**

Run:
```bash
wrangler secret put PRIVATE_KEY
wrangler secret put SEPOLIA_RPC_URL
wrangler secret put SEPOLIA_RPC_URL_FALLBACK
wrangler secret put ALLOWED_ORIGINS
```

**Step 2: Deploy**

Run: `bun run deploy`
Expected: Deployed successfully with URL

**Step 3: Commit any final changes**

```bash
git add -A
git commit -m "chore: finalize deployment configuration"
```
