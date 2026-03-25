/**
 * Third-party Skill API handlers (v1).
 *
 * Endpoints:
 *   GET /api/v1/public/skills/search   – search by keyword / name, returns normalized metadata
 *   GET /api/v1/public/skills/download – get download info for a given slug + optional version
 *
 * Auth: all requests must carry `Authorization: Bearer <token>` matching
 * the THIRD_PARTY_SKILL_API_TOKEN env var (comma-separated list for multi-tenant).
 */

import { api, internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import type { ActionCtx } from '../_generated/server'
import { corsHeaders, mergeHeaders } from '../lib/httpHeaders'
import { requireThirdPartyToken } from '../lib/thirdPartyAuth'
import { json, text, toOptionalNumber } from './shared'

// ──────────────────────────────────────────────────────────────────────────────
// Types returned by existing Convex queries
// ──────────────────────────────────────────────────────────────────────────────

type SearchSkillEntry = {
  score: number
  skill: {
    _id?: Id<'skills'>
    slug?: string
    displayName?: string
    summary?: string | null
    stats?: { downloads: number; stars: number }
    updatedAt?: number
    createdAt?: number
  } | null
  version: {
    version?: string
    changelog?: string
    createdAt?: number
  } | null
}

type GetBySlugResult = {
  skill: {
    _id: Id<'skills'>
    slug: string
    displayName: string
    summary?: string
    tags: Record<string, Id<'skillVersions'>>
    stats: { downloads: number; stars: number }
    createdAt: number
    updatedAt: number
  } | null
  latestVersion: {
    version: string
    changelog: string
    createdAt: number
    softDeletedAt?: number
  } | null
  moderationInfo?: {
    isMalwareBlocked: boolean
    isPendingScan: boolean
    isRemoved: boolean
    isHiddenByMod: boolean
  } | null
} | null

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getSiteUrl(): string {
  return process.env.CONVEX_SITE_URL ?? process.env.VITE_CONVEX_SITE_URL ?? ''
}

function buildDownloadUrl(slug: string, version?: string): string {
  const base = getSiteUrl()
  const url = `${base}/api/v1/download?slug=${encodeURIComponent(slug)}`
  return version ? `${url}&version=${encodeURIComponent(version)}` : url
}

function logAccess(params: {
  tokenId: string
  path: string
  query?: string
  slug?: string
  version?: string
  status: number
}) {
  console.log(
    JSON.stringify({
      type: 'third_party_api',
      tokenId: params.tokenId,
      path: params.path,
      ...(params.query ? { q: params.query } : {}),
      ...(params.slug ? { slug: params.slug } : {}),
      ...(params.version ? { version: params.version } : {}),
      status: params.status,
      ts: Date.now(),
    }),
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/public/skills/search
// ──────────────────────────────────────────────────────────────────────────────

export async function thirdPartySearchSkillsHandler(ctx: ActionCtx, request: Request) {
  const auth = requireThirdPartyToken(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const name = url.searchParams.get('name')?.trim() ?? ''
  const page = toOptionalNumber(url.searchParams.get('page')) ?? 1
  const pageSize = Math.min(toOptionalNumber(url.searchParams.get('pageSize')) ?? 20, 50)

  const searchQuery = q || name
  if (!searchQuery) {
    logAccess({ tokenId: auth.tokenId, path: '/api/v1/public/skills/search', status: 200 })
    return json({ items: [], total: 0, page, pageSize })
  }

  let results: SearchSkillEntry[] = []
  try {
    results = (await ctx.runAction(api.search.searchSkills, {
      query: searchQuery,
      limit: page * pageSize,
    })) as SearchSkillEntry[]
  } catch (err) {
    logAccess({
      tokenId: auth.tokenId,
      path: '/api/v1/public/skills/search',
      query: searchQuery,
      status: 500,
    })
    console.error('Third-party skill search error', err)
    return text('Search failed', 500)
  }

  // Apply client-side pagination (simple slice)
  const start = (page - 1) * pageSize
  const pageResults = results.slice(start, start + pageSize)

  const items = pageResults
    .filter((r) => r.skill?.slug)
    .map((r) => {
      const slug = r.skill!.slug as string
      const version = r.version?.version ?? null
      return {
        id: r.skill!._id ?? null,
        slug,
        displayName: r.skill!.displayName ?? slug,
        description: r.skill!.summary ?? null,
        version,
        changelog: r.version?.changelog ?? null,
        downloadUrl: buildDownloadUrl(slug, version ?? undefined),
        stats: r.skill!.stats ?? null,
        updatedAt: r.skill!.updatedAt ?? null,
      }
    })

  logAccess({
    tokenId: auth.tokenId,
    path: '/api/v1/public/skills/search',
    query: searchQuery,
    status: 200,
  })

  return json({
    items,
    total: results.length,
    page,
    pageSize,
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/v1/public/skills/download
// ──────────────────────────────────────────────────────────────────────────────

export async function thirdPartyDownloadSkillHandler(ctx: ActionCtx, request: Request) {
  const auth = requireThirdPartyToken(request)
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')?.trim().toLowerCase()
  const versionParam = url.searchParams.get('version')?.trim() || undefined

  if (!slug) {
    logAccess({ tokenId: auth.tokenId, path: '/api/v1/public/skills/download', status: 400 })
    return text('Missing slug parameter', 400)
  }

  let skillResult: GetBySlugResult
  try {
    skillResult = (await ctx.runQuery(api.skills.getBySlug, { slug })) as GetBySlugResult
  } catch (err) {
    logAccess({
      tokenId: auth.tokenId,
      path: '/api/v1/public/skills/download',
      slug,
      version: versionParam,
      status: 500,
    })
    console.error('Third-party skill download lookup error', err)
    return text('Lookup failed', 500)
  }

  if (!skillResult?.skill) {
    logAccess({
      tokenId: auth.tokenId,
      path: '/api/v1/public/skills/download',
      slug,
      version: versionParam,
      status: 404,
    })
    return text('Skill not found', 404)
  }

  const mod = skillResult.moderationInfo
  if (mod?.isMalwareBlocked) {
    logAccess({
      tokenId: auth.tokenId,
      path: '/api/v1/public/skills/download',
      slug,
      version: versionParam,
      status: 403,
    })
    return text('Skill blocked: flagged as malicious', 403)
  }
  if (mod?.isPendingScan) {
    logAccess({
      tokenId: auth.tokenId,
      path: '/api/v1/public/skills/download',
      slug,
      version: versionParam,
      status: 423,
    })
    return text('Skill is pending a security scan. Try again later.', 423)
  }
  if (mod?.isRemoved || mod?.isHiddenByMod) {
    logAccess({
      tokenId: auth.tokenId,
      path: '/api/v1/public/skills/download',
      slug,
      version: versionParam,
      status: 410,
    })
    return text('Skill is not available', 410)
  }

  const skill = skillResult.skill
  let resolvedVersion = skillResult.latestVersion?.version ?? null
  let resolvedChangelog = skillResult.latestVersion?.changelog ?? null

  if (versionParam) {
    const specificVersion = await ctx.runQuery(api.skills.getVersionBySkillAndVersion, {
      skillId: skill._id,
      version: versionParam,
    })

    if (!specificVersion) {
      logAccess({
        tokenId: auth.tokenId,
        path: '/api/v1/public/skills/download',
        slug,
        version: versionParam,
        status: 404,
      })
      return text('Version not found', 404)
    }

    if ((specificVersion as { softDeletedAt?: number }).softDeletedAt) {
      logAccess({
        tokenId: auth.tokenId,
        path: '/api/v1/public/skills/download',
        slug,
        version: versionParam,
        status: 410,
      })
      return text('Version not available', 410)
    }

    resolvedVersion = (specificVersion as { version: string }).version
    resolvedChangelog = (specificVersion as { changelog: string }).changelog
  }

  if (!resolvedVersion) {
    logAccess({
      tokenId: auth.tokenId,
      path: '/api/v1/public/skills/download',
      slug,
      status: 404,
    })
    return text('No published version found', 404)
  }

  logAccess({
    tokenId: auth.tokenId,
    path: '/api/v1/public/skills/download',
    slug,
    version: resolvedVersion,
    status: 200,
  })

  return json({
    slug: skill.slug,
    displayName: skill.displayName,
    version: resolvedVersion,
    changelog: resolvedChangelog,
    downloadUrl: buildDownloadUrl(slug, resolvedVersion),
  })
}
