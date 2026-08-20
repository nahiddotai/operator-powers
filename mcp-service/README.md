# Operator Powers MCP Worker

The production service is a single Cloudflare Worker backed by D1 and KV.

## Production endpoints

- `/mcp` — Streamable HTTP MCP endpoint
- `/health` — public service and release health
- `/t` — anonymous, fixed-shape activation telemetry
- `/dashboard` — owner metrics dashboard
- `/stats` — owner metrics JSON protected by `STATS_KEY`

## Required Cloudflare secrets

Set these once in the production Worker:

```sh
npx wrangler secret put TOKEN_SECRET
npx wrangler secret put STATS_KEY
```

`OPENAI_APPS_CHALLENGE` is optional after domain verification is complete.

## Automatic deployment

Every push to `main` now validates the plugin, type-checks and dry-runs the
Worker, applies the idempotent D1 schema, deploys, and checks `/health`.

Add these GitHub Actions repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Create the API token with the narrow Cloudflare **Edit Cloudflare Workers**
template and restrict it to the account that owns `operator-powers`. The token
also needs access to the bound D1 database because CI applies `schema.sql`.

## Manual deployment

```sh
cd mcp-service
npm ci
npm run deploy:production
```

Do not commit Cloudflare tokens, `STATS_KEY`, `TOKEN_SECRET`, `.dev.vars`, or
`.stats-key`.
