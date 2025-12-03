import type { Context, Next } from 'hono'
import type { Env } from '../types'

export function matchesPattern(origin: string, pattern: string): boolean {
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
