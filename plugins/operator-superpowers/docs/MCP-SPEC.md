# Update Server (MCP) Specification

Server name: `operator_superpowers`. Endpoint: `POST /mcp` (MCP Streamable HTTP, stateless JSON-RPC). Health: `GET /health`. Source: `mcp-service/`.

## Canonical URL rule

The URL baked into the plugin's `.mcp.json` is permanent. Deploy to the Cloudflare Workers `workers.dev` subdomain and never change the packaged URL; a custom domain may later alias the same Worker. The placeholder `PENDING-CLOUDFLARE-DEPLOY` must be replaced with the real URL BEFORE any release is tagged (validate-package flags this).

## Tools

Read (annotated read-only, no auth, no application-level query retention): `search_superpowers`, `get_superpower`, `get_whats_new`, `get_install_help`, `get_product_status`, `get_census_results` (aggregate only; returns a gathering notice below 5 total entries).

Write protocol (annotated non-read-only):
1. `prepare_feedback` / `prepare_superpower_request` / `prepare_census` validate the payload and return `{payload, payloadHash, confirmationToken, expiresAt, instruction}`. Nothing is stored.
2. The skill shows the exact payload to the user and obtains explicit approval.
3. `submit_feedback` / `submit_superpower_request` / `submit_census` require the unmodified payload, matching hash, and valid unexpired token. Any mismatch returns a non-submitting error.
4. Every successful submission returns a receipt id, a shown-once deletion token, the stored fields, and the retention period.
5. `delete_my_submission` deletes by receipt id plus deletion token, across both the submissions and census tables.

## Confirmation tokens

`{action}.{expiresAtISO}.{hmacSha256(TOKEN_SECRET, action|payloadHash|expiresAt)}`. TTL 10 minutes. TOKEN_SECRET lives only in Worker secrets (generate with `openssl rand -hex 32`). Rotation: change the secret; in-flight preparations fail closed and simply require re-preparation.

## Hard input limits (design requirements, not just tests)

- Field allowlists: feedback = skillId (must exist in catalogue), rating (int 1-5), note (<=1000 chars); request = job (10-1000 chars), category (<=100 chars); census = role, aiHours, mainTool (each from a fixed server-side enum) + annoyingTask (10-200 chars). Unknown fields rejected.
- Total canonical payload <= 4096 bytes.
- These caps are the primary bound on prompt-injection exfiltration through the feedback channel. The census free-text cap of 200 characters is deliberately tighter for the same reason: it is the only free-text field in a publicly readable aggregate.

## Storage

Cloudflare D1 (see `schema.sql`). Table `submissions`: approved fields, ISO timestamp, salted deletion-token hash, plugin version. Table `census`: the four approved fields, coarse Cloudflare edge country, ISO timestamp, deletion-token hash, plugin version; no install id, so census entries cannot be joined to telemetry. No IP columns, no email, no conversation content anywhere. Retention 12 months.

## Rate limits

Per daily-rotating fingerprint (truncated IP + coarse UA + date, hashed; never stored raw): 60 reads/minute, 10 writes/day. Global write ceiling: 500/day. Over-limit responses are honest errors the skills surface as such.

## Kill switch

`WRITES_ENABLED` var: setting to "false" disables all write tools while read tools stay up.

## Deploy runbook

1. `cd mcp-service && npm install`
2. `npx wrangler d1 create operator-superpowers` then paste the id into wrangler.toml
3. `npx wrangler d1 execute operator-superpowers --file=schema.sql --remote`
4. `npx wrangler kv namespace create RATE_KV` then paste the id into wrangler.toml
5. `openssl rand -hex 32 | npx wrangler secret put TOKEN_SECRET`
6. `npx wrangler deploy` and note the workers.dev URL
7. Put `https://<worker-url>/mcp` into `plugins/operator-superpowers/.mcp.json`
8. Contract-check: initialize, tools/list (13 tools, correct annotations), a search call, the full prepare -> submit -> delete flow for each write pair (feedback, request, census), a census enum rejection, an expired/altered-payload rejection, and `GET /health`.
