/**
 * Third-party API access token auth.
 *
 * Reads THIRD_PARTY_SKILL_API_TOKEN from the Convex environment.
 * Supports a comma-separated list for multi-tenant expansion.
 *
 * Usage:
 *   const auth = requireThirdPartyToken(request)
 *   if (!auth.ok) return auth.response
 */

import { corsHeaders, mergeHeaders } from './httpHeaders'

type TokenCheckOk = { ok: true; tokenId: string }
type TokenCheckFail = { ok: false; response: Response }
type TokenCheckResult = TokenCheckOk | TokenCheckFail

function parseTokenList(): string[] {
  const raw = process.env.THIRD_PARTY_SKILL_API_TOKEN ?? ''
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function unauthorized(message: string): TokenCheckFail {
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: mergeHeaders(
        { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        corsHeaders(),
      ),
    }),
  }
}

/**
 * Validates the Bearer token in the Authorization header against
 * the server-side THIRD_PARTY_SKILL_API_TOKEN env var.
 *
 * Returns `{ ok: true, tokenId }` on success, or `{ ok: false, response }` to return directly.
 */
export function requireThirdPartyToken(request: Request): TokenCheckResult {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization') ?? ''
  const trimmed = header.trim()

  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return unauthorized('Missing or invalid Authorization header. Expected: Bearer <token>')
  }

  const incoming = trimmed.slice(7).trim()
  if (!incoming) {
    return unauthorized('Empty token')
  }

  const allowed = parseTokenList()
  if (allowed.length === 0) {
    return unauthorized('Third-party API access is not configured on this server')
  }

  const idx = allowed.indexOf(incoming)
  if (idx === -1) {
    return unauthorized('Invalid token')
  }

  // Return a stable, non-secret identifier for logs (token index, 1-based)
  return { ok: true, tokenId: `token_${idx + 1}` }
}
