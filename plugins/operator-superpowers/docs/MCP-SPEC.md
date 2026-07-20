# Update Server (MCP) Specification

Server name: `operator_superpowers`. Endpoint: `POST /mcp` (MCP Streamable HTTP, stateless JSON-RPC). Health: `GET /health`. Source: `mcp-service/`.

## Canonical URL rule

The URL baked into the plugin's `.mcp.json` is permanent. Deploy to the Cloudflare Workers `workers.dev` subdomain and never change the packaged URL; a custom domain may later alias the same Worker. The placeholder `PENDING-CLOUDFLARE-DEPLOY` must be replaced with the real URL BEFORE any release is tagged (validate-package flags this).

## Tools

Read (annotated read-only, no auth, no application-level query retention): `search_superpowers`, `get_superpower`, `get_whats_new`, `get_install_help`, `get_product_status`.

Write protocol (annotated non-read-only):
1. `prepare_feedback` / `prepare_superpower_request` validate the payload and return `{payload, payloadHash, confirmationToken, expiresAt, instruction}`. Nothing is stored.
2. The skill shows the exact payload to the user and obtains explicit approval.
3. `submit_feedback` / `submit_superpower_request` require the unmodified payload, matching hash, and valid unexpired token. Any mismatch returns a non-submitting error.
4. Every successful submission returns a receipt id, a shown-once deletion token, the stored fields, and the retention period.
5. `delete_my_submission` deletes by receipt id plus deletion token.

## Confirmation tokens

`{action}.{expiresAtISO}.{hmacSha256(TOKEN_SECRET, action|payloadHash|expiresAt)}`. TTL 10 minutes. TOKEN_SECRET lives only in Worker secrets (generate with `openssl rand -hex 32`). Rotation: change the secret; in-flight preparations fail closed and simply require re-preparation.

## Hard input limits (design requirements, not just tests)

- Field allowlists: feedback = skillId (must exist in catalogue), rating (int 1-5), note (<=1000 chars); request = job (10-1000 chars), category (<=100 chars). Unknown fields rejected.
- Total canonical payload <= 4096 bytes.
- These caps are the primary bound on prompt-injection exfiltration through the feedback channel.

## Storage

Cloudflare D1, table `submissions` (see `schema.sql`): approved fields, ISO timestamp, salted deletion-token hash, plugin version. No IP column, no email, no conversation content. Retention 12 months.

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
8. Contract-check: initialize, tools/list (10 tools, correct annotations), a search call, the full prepare -> submit -> delete flow, an expired/altered-payload rejection, and `GET /health`.
