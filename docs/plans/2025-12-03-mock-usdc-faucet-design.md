# Mock USDC Faucet - Design Document

## Overview

A Cloudflare Worker that mints mock USDC and DAI tokens on Sepolia testnet. Built with Bun, Hono, and viem.

## API Endpoints

### POST /mint/usdc
Mint USDC to a recipient address.

**Request:**
```json
{ "recipient": "0x..." }
```

**Response:**
```json
{ "txHash": "0x...", "balance": "1000" }
```

### POST /mint/dai
Mint DAI to a recipient address.

**Request:**
```json
{ "recipient": "0x..." }
```

**Response:**
```json
{ "txHash": "0x...", "balance": "1000" }
```

### POST /mint
Mint both USDC and DAI to a recipient address.

**Request:**
```json
{ "recipient": "0x..." }
```

**Response:**
```json
{
  "usdc": { "txHash": "0x...", "balance": "1000" },
  "dai": { "txHash": "0x...", "balance": "1000" }
}
```

## Security

Origin-based allowlist with wildcard support. Origins configured via `ALLOWED_ORIGINS` secret (comma-separated).

Examples:
- `*.ens.domains` - matches any subdomain
- `localhost:*` - matches any port on localhost

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PRIVATE_KEY` | Wallet private key for signing | `0xabc123...` |
| `SEPOLIA_RPC_URL` | Primary RPC endpoint | `https://eth-sepolia.g.alchemy.com/v2/...` |
| `SEPOLIA_RPC_URL_FALLBACK` | Fallback RPC endpoint | `https://sepolia.infura.io/v3/...` |
| `ALLOWED_ORIGINS` | Comma-separated origins | `*.ens.domains,localhost:*` |
| `USDC_MINT_AMOUNT` | USDC amount (human units) | `1000` |
| `DAI_MINT_AMOUNT` | DAI amount (human units) | `1000` |

## Token Addresses (Sepolia)

- Mock USDC: `0x9028ab8e872af36c30c959a105cb86d1038412ae`
- Mock DAI: `0x6630589c2e6364a96bb7acf0d9d64ac9c1dd3528`

## Project Structure

```
mock-usdc-faucet/
├── src/
│   ├── index.ts          # Hono app entry point, route definitions
│   ├── middleware/
│   │   └── origin.ts     # Origin validation middleware
│   ├── services/
│   │   └── mint.ts       # Token minting logic (reusable)
│   ├── lib/
│   │   ├── client.ts     # Viem client setup with fallback
│   │   └── config.ts     # Token addresses, ABI, types
│   └── types.ts          # Shared TypeScript types
├── wrangler.toml         # Cloudflare Worker config
├── package.json
└── tsconfig.json
```

## Error Handling

**Status codes:**
- `200` - Success
- `400` - Invalid request (missing/invalid recipient)
- `403` - Origin not allowed
- `500` - RPC or transaction failure

**Error response format:**
```json
{ "error": "Error message here" }
```

## RPC Fallback Strategy

1. Attempt transaction with primary RPC
2. On connection/timeout error, retry with fallback RPC
3. If both fail, return 500 with error details

## Dependencies

- `hono` - Web framework
- `viem` - Ethereum client

**Dev dependencies:**
- `wrangler` - Cloudflare CLI
- `typescript`
- `@cloudflare/workers-types`
