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
