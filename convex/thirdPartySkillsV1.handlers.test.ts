/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./lib/thirdPartyAuth', () => ({
  requireThirdPartyToken: vi.fn(),
}))

const { requireThirdPartyToken } = await import('./lib/thirdPartyAuth')
const { __handlers } = await import('./httpApiV1')

type ActionCtx = import('./_generated/server').ActionCtx

function makeCtx(partial: Partial<ActionCtx> = {}): ActionCtx {
  return {
    runQuery: vi.fn().mockResolvedValue(null),
    runMutation: vi.fn().mockResolvedValue(null),
    runAction: vi.fn().mockResolvedValue([]),
    storage: { get: vi.fn(), store: vi.fn(), getUrl: vi.fn(), delete: vi.fn() },
    scheduler: { runAfter: vi.fn(), runAt: vi.fn(), cancel: vi.fn() },
    vectorSearch: vi.fn().mockResolvedValue([]),
    ...partial,
  } as unknown as ActionCtx
}

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers })
}

const VALID_TOKEN = 'test-token-abc123'
const INVALID_TOKEN = 'wrong-token'

function mockAuthOk() {
  vi.mocked(requireThirdPartyToken).mockReturnValue({ ok: true, tokenId: 'token_1' })
}

function mockAuthFail() {
  vi.mocked(requireThirdPartyToken).mockReturnValue({
    ok: false,
    response: new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  })
}

beforeEach(() => {
  vi.mocked(requireThirdPartyToken).mockReset()
})

// ──────────────────────────────────────────────────────────────────────────────
// Search endpoint tests
// ──────────────────────────────────────────────────────────────────────────────

describe('thirdPartySearchSkillsHandler', () => {
  it('returns 401 when token is missing or invalid', async () => {
    mockAuthFail()
    const ctx = makeCtx()
    const req = makeRequest('https://example.com/api/v1/public/skills/search?q=test')
    const res = await __handlers.thirdPartySearchSkillsHandler(ctx, req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeTruthy()
    expect(vi.mocked(ctx.runAction)).not.toHaveBeenCalled()
  })

  it('returns empty items when no query is provided', async () => {
    mockAuthOk()
    const ctx = makeCtx()
    const req = makeRequest('https://example.com/api/v1/public/skills/search')
    const res = await __handlers.thirdPartySearchSkillsHandler(ctx, req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })

  it('returns normalized skill items for a keyword search', async () => {
    mockAuthOk()
    const mockResults = [
      {
        score: 0.9,
        skill: {
          _id: 'skills:abc123',
          slug: 'my-skill',
          displayName: 'My Skill',
          summary: 'Does things',
          stats: { downloads: 10, stars: 5 },
          updatedAt: 1700000000000,
          createdAt: 1600000000000,
        },
        version: {
          version: '1.2.3',
          changelog: 'Initial release',
          createdAt: 1700000000000,
        },
      },
    ]
    const ctx = makeCtx({ runAction: vi.fn().mockResolvedValue(mockResults) })
    const req = makeRequest('https://example.com/api/v1/public/skills/search?q=my+skill')
    const res = await __handlers.thirdPartySearchSkillsHandler(ctx, req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    const item = body.items[0]
    expect(item.slug).toBe('my-skill')
    expect(item.displayName).toBe('My Skill')
    expect(item.version).toBe('1.2.3')
    expect(item.changelog).toBe('Initial release')
    expect(item.downloadUrl).toContain('my-skill')
    expect(item.downloadUrl).toContain('1.2.3')
  })

  it('returns empty items when search finds nothing', async () => {
    mockAuthOk()
    const ctx = makeCtx({ runAction: vi.fn().mockResolvedValue([]) })
    const req = makeRequest(
      'https://example.com/api/v1/public/skills/search?q=nonexistent-skill-xyz',
    )
    const res = await __handlers.thirdPartySearchSkillsHandler(ctx, req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
    expect(body.total).toBe(0)
  })

  it('supports searching by name parameter', async () => {
    mockAuthOk()
    const ctx = makeCtx({ runAction: vi.fn().mockResolvedValue([]) })
    const req = makeRequest('https://example.com/api/v1/public/skills/search?name=exact-skill')
    await __handlers.thirdPartySearchSkillsHandler(ctx, req)
    expect(vi.mocked(ctx.runAction)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ query: 'exact-skill' }),
    )
  })

  it('respects pagination parameters', async () => {
    mockAuthOk()
    const manyResults = Array.from({ length: 30 }, (_, i) => ({
      score: 1 - i * 0.01,
      skill: {
        _id: `skills:id${i}`,
        slug: `skill-${i}`,
        displayName: `Skill ${i}`,
        stats: { downloads: 0, stars: 0 },
        updatedAt: Date.now(),
      },
      version: { version: '1.0.0', changelog: 'v1', createdAt: Date.now() },
    }))
    const ctx = makeCtx({ runAction: vi.fn().mockResolvedValue(manyResults) })
    const req = makeRequest(
      'https://example.com/api/v1/public/skills/search?q=skill&page=2&pageSize=10',
    )
    const res = await __handlers.thirdPartySearchSkillsHandler(ctx, req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(10)
    expect(body.page).toBe(2)
    expect(body.pageSize).toBe(10)
    expect(body.total).toBe(30)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Download endpoint tests
// ──────────────────────────────────────────────────────────────────────────────

describe('thirdPartyDownloadSkillHandler', () => {
  it('returns 401 when token is missing or invalid', async () => {
    mockAuthFail()
    const ctx = makeCtx()
    const req = makeRequest(
      'https://example.com/api/v1/public/skills/download?slug=my-skill',
    )
    const res = await __handlers.thirdPartyDownloadSkillHandler(ctx, req)
    expect(res.status).toBe(401)
    expect(vi.mocked(ctx.runQuery)).not.toHaveBeenCalled()
  })

  it('returns 400 when slug is missing', async () => {
    mockAuthOk()
    const ctx = makeCtx()
    const req = makeRequest('https://example.com/api/v1/public/skills/download')
    const res = await __handlers.thirdPartyDownloadSkillHandler(ctx, req)
    expect(res.status).toBe(400)
  })

  it('returns 404 when skill does not exist', async () => {
    mockAuthOk()
    const ctx = makeCtx({ runQuery: vi.fn().mockResolvedValue(null) })
    const req = makeRequest(
      'https://example.com/api/v1/public/skills/download?slug=nonexistent',
    )
    const res = await __handlers.thirdPartyDownloadSkillHandler(ctx, req)
    expect(res.status).toBe(404)
  })

  it('returns download info for a valid skill (latest version)', async () => {
    mockAuthOk()
    const mockSkillResult = {
      skill: {
        _id: 'skills:abc',
        slug: 'my-skill',
        displayName: 'My Skill',
        tags: {},
        stats: { downloads: 5, stars: 2 },
        createdAt: 1600000000000,
        updatedAt: 1700000000000,
      },
      latestVersion: {
        version: '2.0.0',
        changelog: 'Big update',
        createdAt: 1700000000000,
      },
      moderationInfo: null,
    }
    const ctx = makeCtx({ runQuery: vi.fn().mockResolvedValue(mockSkillResult) })
    const req = makeRequest(
      'https://example.com/api/v1/public/skills/download?slug=my-skill',
    )
    const res = await __handlers.thirdPartyDownloadSkillHandler(ctx, req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slug).toBe('my-skill')
    expect(body.displayName).toBe('My Skill')
    expect(body.version).toBe('2.0.0')
    expect(body.changelog).toBe('Big update')
    expect(body.downloadUrl).toContain('my-skill')
    expect(body.downloadUrl).toContain('2.0.0')
  })

  it('returns 404 when specific version does not exist', async () => {
    mockAuthOk()
    const mockSkillResult = {
      skill: {
        _id: 'skills:abc',
        slug: 'my-skill',
        displayName: 'My Skill',
        tags: {},
        stats: { downloads: 5, stars: 2 },
        createdAt: 1600000000000,
        updatedAt: 1700000000000,
      },
      latestVersion: { version: '2.0.0', changelog: 'Big update', createdAt: 1700000000000 },
      moderationInfo: null,
    }
    const ctx = makeCtx({
      runQuery: vi
        .fn()
        .mockResolvedValueOnce(mockSkillResult)
        .mockResolvedValueOnce(null),
    })
    const req = makeRequest(
      'https://example.com/api/v1/public/skills/download?slug=my-skill&version=9.9.9',
    )
    const res = await __handlers.thirdPartyDownloadSkillHandler(ctx, req)
    expect(res.status).toBe(404)
  })

  it('returns 403 for malware-blocked skill', async () => {
    mockAuthOk()
    const mockSkillResult = {
      skill: {
        _id: 'skills:abc',
        slug: 'bad-skill',
        displayName: 'Bad Skill',
        tags: {},
        stats: { downloads: 0, stars: 0 },
        createdAt: 1600000000000,
        updatedAt: 1700000000000,
      },
      latestVersion: null,
      moderationInfo: {
        isMalwareBlocked: true,
        isPendingScan: false,
        isRemoved: false,
        isHiddenByMod: false,
      },
    }
    const ctx = makeCtx({ runQuery: vi.fn().mockResolvedValue(mockSkillResult) })
    const req = makeRequest(
      'https://example.com/api/v1/public/skills/download?slug=bad-skill',
    )
    const res = await __handlers.thirdPartyDownloadSkillHandler(ctx, req)
    expect(res.status).toBe(403)
  })
})
