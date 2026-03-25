<p align="center">
  <img src="public/clawd-logo.png" alt="ClawHub" width="120">
</p>

<h1 align="center">ClawHub</h1>

<p align="center">
  <a href="https://github.com/openclaw/clawhub/actions/workflows/ci.yml?branch=main"><img src="https://img.shields.io/github/actions/workflow/status/openclaw/clawhub/ci.yml?branch=main&style=for-the-badge" alt="CI status"></a>
  <a href="https://discord.gg/clawd"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

ClawHub is the **public skill registry for Clawdbot**: publish, version, and search text-based agent skills (a `SKILL.md` plus supporting files).
It's designed for fast browsing + a CLI-friendly API, with moderation hooks and vector search.

onlycrabs.ai is the **SOUL.md registry**: publish and share system lore the same way you publish skills.

<p align="center">
  <a href="https://clawhub.ai">ClawHub</a> ·
  <a href="https://onlycrabs.ai">onlycrabs.ai</a> ·
  <a href="VISION.md">Vision</a> ·
  <a href="docs/README.md">Docs</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="https://discord.gg/clawd">Discord</a>
</p>

## What you can do with it

- Browse skills + render their `SKILL.md`.
- Publish new skill versions with changelogs + tags (including `latest`).
- Browse souls + render their `SOUL.md`.
- Publish new soul versions with changelogs + tags.
- Search via embeddings (vector index) instead of brittle keywords.
- Star + comment; admins/mods can curate and approve skills.

## onlycrabs.ai (SOUL.md registry)

- Entry point is host-based: `onlycrabs.ai`.
- On the onlycrabs.ai host, the home page and nav default to souls.
- On ClawHub, souls live under `/souls`.
- Soul bundles only accept `SOUL.md` for now (no extra files).

## How it works (high level)

- Web app: TanStack Start (React, Vite/Nitro).
- Backend: Convex (DB + file storage + HTTP actions) + Convex Auth (GitHub OAuth).
- Search: OpenAI embeddings (`text-embedding-3-small`) + Convex vector search.
- API schema + routes: `packages/schema` (`clawhub-schema`).

## CLI

Common CLI flows:

- Auth: `clawhub login`, `clawhub whoami`
- Discover: `clawhub search ...`, `clawhub explore`
- Manage local installs: `clawhub install <slug>`, `clawhub uninstall <slug>`, `clawhub list`, `clawhub update --all`
- Inspect without installing: `clawhub inspect <slug>`
- Publish/sync: `clawhub publish <path>`, `clawhub sync`

Docs: [`docs/quickstart.md`](docs/quickstart.md), [`docs/cli.md`](docs/cli.md).

### Removal permissions

- `clawhub uninstall <slug>` only removes a local install on your machine.
- Uploaded registry skills use soft-delete/restore (`clawhub delete <slug>` / `clawhub undelete <slug>` or API equivalents).
- Soft-delete/restore is allowed for the skill owner, moderators, and admins.
- Hard delete is admin-only (management tools / ban flows).


## Telemetry

ClawHub tracks minimal **install telemetry** (to compute install counts) when you run `clawhub sync` while logged in.
Disable via:

```bash
export CLAWHUB_DISABLE_TELEMETRY=1
```

Details: [`docs/telemetry.md`](docs/telemetry.md).

## Repo layout

- `src/` — TanStack Start app (routes, components, styles).
- `convex/` — schema + queries/mutations/actions + HTTP API routes.
- `packages/schema/` — shared API types/routes for the CLI and app.
- [`docs/`](docs/README.md) — project documentation (architecture, CLI, auth, deployment, and more).
- [`docs/spec.md`](docs/spec.md) — product + implementation spec (good first read).

## Quick Deploy (Docker)

Want to deploy with one command? See [README_DEPLOY.md](README_DEPLOY.md).

```bash
# Generate secrets and configure
./scripts/generate-secrets.sh

# Edit .env.docker with your GitHub OAuth credentials

# Deploy everything with one command
docker compose up -d
```

This starts:
- Frontend (port 3000)
- Convex backend (self-hosted)
- PostgreSQL database
- Redis cache

Access at http://localhost:3000

## Local dev

Prereqs: [Bun](https://bun.sh/) (Convex runs via `bunx`, no global install needed).

```bash
bun install
cp .env.local.example .env.local
# edit .env.local — see CONTRIBUTING.md for local Convex values

# terminal A: local Convex backend
bunx convex dev

# terminal B: web app (port 3000)
bun run dev

# seed sample data
bunx convex run --no-push devSeed:seedNixSkills
```

For full setup instructions (env vars, GitHub OAuth, JWT keys, database seeding), see [CONTRIBUTING.md](CONTRIBUTING.md).

## Self-Hosting Deployment

ClawHub supports full self-hosted deployment using the open-source [Convex Backend](https://github.com/get-convex/convex-backend). This gives you complete control over your infrastructure.

### Architecture Overview

A self-hosted deployment consists of three components:

1. **Convex Backend** — Database, server functions, and HTTP actions
2. **GitHub OAuth App** — Authentication provider
3. **ClawHub Frontend** — TanStack Start web application

### Prerequisites

- Docker and Docker Compose
- A domain name (e.g., `convex.dev.3211.com` for Convex HTTP actions, `clawhub.yourdomain.com` for the frontend)
- GitHub account for OAuth configuration

### Step 1: Deploy Convex Backend

#### 1.1 Create Configuration Files

Download or create a `docker-compose.yml` file for Convex Backend, then create a `.env` file:

```bash
# .env for Convex Backend
CONVEX_CLOUD_ORIGIN='http://10.18.1.62:3210'
CONVEX_SITE_ORIGIN='https://convex.dev.3211.com'
NEXT_PUBLIC_DEPLOYMENT_URL='http://10.18.1.62:3210'
RUST_LOG=debug
```

**Important Notes:**
- `CONVEX_SITE_ORIGIN` **must** use `https://` protocol (required for GitHub OAuth callbacks)
- `CONVEX_CLOUD_ORIGIN` and `NEXT_PUBLIC_DEPLOYMENT_URL` point to your Convex API endpoint
- Replace IP addresses and domains with your actual deployment URLs

#### 1.2 Start Convex Backend

```bash
docker compose up
```

#### 1.3 Generate Admin Key

Once the backend is running, generate an admin key for the dashboard/CLI:

```bash
docker compose exec backend ./generate_admin_key.sh
```

Save the generated key securely.

#### 1.4 Access Convex Services

- **Dashboard**: http://localhost:6791
- **Backend API**: http://127.0.0.1:3210
- **HTTP Actions**: http://127.0.0.1:3211

#### 1.5 Configure Project Environment

In your ClawHub project, create a `.env.local` file (do NOT commit to version control):

```bash
# .env.local
CONVEX_SELF_HOSTED_URL='http://127.0.0.1:3210'
CONVEX_SELF_HOSTED_ADMIN_KEY='<your admin key from generate_admin_key.sh>'
```

### Step 2: Configure GitHub OAuth App

1. Navigate to [GitHub OAuth Apps](https://github.com/settings/applications/new)
2. Create a new OAuth App with the following configuration:
   - **Application name**: ClawHub (or your preferred name)
   - **Homepage URL**: Your ClawHub frontend domain (e.g., `https://clawhub.yourdomain.com`)
   - **Authorization callback URL**: `<HTTP Actions URL>/api/auth/callback/github`
     - Example: `https://convex.dev.3211.com/api/auth/callback/github`

3. After creation, save the **Client ID** and **Client Secret**

### Step 3: Deploy ClawHub Frontend

#### 3.1 Configure Vercel Routing

Update `vercel.json` to point to your Convex HTTP Actions URL:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://convex.dev.3211.com/api/$1"
    }
  ]
}
```

#### 3.2 Update Well-Known Files

Update the following files with your ClawHub domain:

**`public/.well-known/clawhub.json`**:
```json
{
  "domain": "clawhub.yourdomain.com"
}
```

**`public/.well-known/clawdhub.json`**:
```json
{
  "domain": "clawhub.yourdomain.com"
}
```

#### 3.3 Prepare Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with the following variables:

```bash
# Site Configuration
SITE_URL='https://clawhub.yourdomain.com'

# Convex URLs
VITE_CONVEX_URL='http://10.18.1.62:3210'
VITE_CONVEX_SITE_URL='https://convex.dev.3211.com'

# GitHub OAuth
AUTH_GITHUB_ID='<your GitHub OAuth Client ID>'
AUTH_GITHUB_SECRET='<your GitHub OAuth Client Secret>'

# Convex Self-Hosted
CONVEX_SELF_HOSTED_URL='http://10.18.1.62:3210'
CONVEX_SELF_HOSTED_ADMIN_KEY='<your admin key from generate_admin_key.sh>'

# Security
INSTANCE_SECRET='<output from: openssl rand -hex 32>'
```

Generate the `INSTANCE_SECRET`:

```bash
openssl rand -hex 32
```

#### 3.4 Initialize Convex Development

Run the Convex development command to initialize the deployment:

```bash
bunx convex dev --typecheck=disable
```

#### 3.5 Configure Environment Variables in Dashboard

1. Open the Convex Dashboard at http://localhost:6791
2. Navigate to **Settings** → **Environment Variables**
3. Add the following environment variables:

```
AUTH_GITHUB_ID=<your GitHub OAuth Client ID>
AUTH_GITHUB_SECRET=<your GitHub OAuth Client Secret>
INSTANCE_SECRET=<your instance secret>
JWKS=<your JWKS configuration>
JWT_PRIVATE_KEY=<your JWT private key>
SITE_URL=https://clawhub.yourdomain.com
```

**Note:** `JWT_PRIVATE_KEY` and `JWKS` will be generated automatically during the `bunx convex dev` command. You can find them in the dashboard after initialization.

#### 3.6 Build Frontend Docker Image

After all configuration is complete, build the ClawHub frontend Docker image:

```bash
./scripts/build-amd64.sh
```

This creates a production-ready Docker image for deployment.

### Deployment Checklist

- [ ] Convex Backend running with correct URLs
- [ ] Admin key generated and saved
- [ ] GitHub OAuth App configured with correct callback URL
- [ ] All environment variables set in `.env.local`
- [ ] Environment variables configured in Convex Dashboard
- [ ] `vercel.json` updated with HTTP Actions URL
- [ ] Well-known files updated with ClawHub domain
- [ ] Frontend Docker image built successfully

### Troubleshooting

**GitHub OAuth callback errors:**
- Ensure `CONVEX_SITE_ORIGIN` uses `https://` protocol
- Verify callback URL in GitHub OAuth App matches `<HTTP Actions URL>/api/auth/callback/github`
- Check that SSL certificates are properly configured for HTTPS domains

**Convex connection issues:**
- Verify all URL endpoints are accessible from your network
- Check Docker container logs: `docker compose logs -f`
- Ensure admin key is correctly copied without extra whitespace

**Frontend build failures:**
- Run `bunx convex dev --typecheck=disable` first to initialize Convex
- Verify all environment variables are set correctly
- Check that Convex Dashboard shows all required environment variables

### Security Considerations

- Never commit `.env.local` or any files containing secrets to version control
- Rotate `INSTANCE_SECRET` and OAuth credentials periodically
- Use HTTPS for all production domains
- Restrict access to Convex Dashboard (port 6791) to trusted networks only
- Regularly update Docker images and dependencies

### Support

For issues with Convex Backend, refer to the [official documentation](https://github.com/get-convex/convex-backend) or join the `#self-hosted` channel on Convex Discord.

For ClawHub-specific issues, open a GitHub issue or join our [Discord community](https://discord.gg/clawd).

## Environment

- `VITE_CONVEX_URL`: Convex deployment URL (`https://<deployment>.convex.cloud`).
- `VITE_CONVEX_SITE_URL`: Convex site URL (`https://<deployment>.convex.site`).
- `VITE_SOULHUB_SITE_URL`: onlycrabs.ai site URL (`https://onlycrabs.ai`).
- `VITE_SOULHUB_HOST`: onlycrabs.ai host match (`onlycrabs.ai`).
- `VITE_SITE_MODE`: Optional override (`skills` or `souls`) for SSR builds.
- `CONVEX_SITE_URL`: same as `VITE_CONVEX_SITE_URL` (auth + cookies).
- `SITE_URL`: App URL (local: `http://localhost:3000`).
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`: GitHub OAuth App.
- `JWT_PRIVATE_KEY` / `JWKS`: Convex Auth keys.
- `OPENAI_API_KEY`: embeddings for search + indexing.

## Nix plugins (nixmode skills)

ClawHub can store a nix-clawdbot plugin pointer in SKILL frontmatter so the registry knows which
Nix package bundle to install. A nix plugin is different from a regular skill pack: it bundles the
skill pack, the CLI binary, and its config flags/requirements together.

Add this to `SKILL.md`:

```yaml
---
name: peekaboo
description: Capture and automate macOS UI with the Peekaboo CLI.
metadata: {"clawdbot":{"nix":{"plugin":"github:clawdbot/nix-steipete-tools?dir=tools/peekaboo","systems":["aarch64-darwin"]}}}
---
```

Install via nix-clawdbot:

```nix
programs.clawdbot.plugins = [
  { source = "github:clawdbot/nix-steipete-tools?dir=tools/peekaboo"; }
];
```

You can also declare config requirements + an example snippet:

```yaml
---
name: padel
description: Check padel court availability and manage bookings via Playtomic.
metadata: {"clawdbot":{"config":{"requiredEnv":["PADEL_AUTH_FILE"],"stateDirs":[".config/padel"],"example":"config = { env = { PADEL_AUTH_FILE = \\\"/run/agenix/padel-auth\\\"; }; };"}}}
---
```

To show CLI help (recommended for nix plugins), include the `cli --help` output:

```yaml
---
name: padel
description: Check padel court availability and manage bookings via Playtomic.
metadata: {"clawdbot":{"cliHelp":"padel --help\\nUsage: padel [command]\\n"}}
---
```

`metadata.clawdbot` is preferred, but `metadata.clawdis` and `metadata.openclaw` are accepted as aliases.

## Skill metadata

Skills declare their runtime requirements (env vars, binaries, install specs) in the `SKILL.md` frontmatter. ClawHub's security analysis checks these declarations against actual skill behavior.

Full reference: [`docs/skill-format.md`](docs/skill-format.md#frontmatter-metadata)

Quick example:

```yaml
---
name: my-skill
description: Does a thing with an API.
metadata:
  openclaw:
    requires:
      env:
        - MY_API_KEY
      bins:
        - curl
    primaryEnv: MY_API_KEY
---
```

## Scripts

```bash
bun run dev
bun run build
bun run test
bun run coverage
bun run lint
```
