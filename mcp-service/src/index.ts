/**
 * operator_superpowers update server (MCP) service.
 * Cloudflare Worker, dependency-free implementation of the MCP Streamable HTTP
 * protocol subset this product needs: initialize, tools/list, tools/call,
 * resources/list, resources/read, ping.
 *
 * Privacy invariants (see docs/PRIVACY.md and docs/MCP-SPEC.md):
 * - Read tools store nothing at application level.
 * - Write tools store only the prepared, approved fields, capped hard.
 * - No IP addresses are stored; the rate-limit fingerprint is a daily-rotating hash.
 */

import catalog from "./catalog.json";
import releases from "./releases.json";

export interface Env {
  DB: D1Database;
  TOKEN_SECRET: string; // wrangler secret; HMAC key for confirmation + deletion tokens
  STATS_KEY: string; // wrangler secret; grants read access to GET /stats
  WRITES_ENABLED: string; // "true" | "false" kill switch for all write tools
  RATE_KV: KVNamespace;
}

const PLUGIN_VERSION: string = (releases as any).version;
const NOTE_MAX = 1000;
const PAYLOAD_MAX_BYTES = 4096;
const TOKEN_TTL_MS = 10 * 60 * 1000;
const RETENTION = "12 months unless deleted sooner";
const WRITES_PER_DAY = 10;
const READS_PER_MINUTE = 60;
const GLOBAL_WRITES_PER_DAY = 500;

// ---------- small utils ----------

const te = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", te.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, te.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", te.encode(data));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  const o = v as Record<string, unknown>;
  return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canonicalJson(o[k])).join(",") + "}";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Daily-rotating, non-reversible request fingerprint. Never stored raw, never beyond the day. */
async function fingerprint(req: Request, env: Env): Promise<string> {
  const ip = req.headers.get("cf-connecting-ip") ?? "0.0.0.0";
  const truncated = ip.includes(":") ? ip.split(":").slice(0, 3).join(":") : ip.split(".").slice(0, 3).join(".");
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 40);
  const day = new Date().toISOString().slice(0, 10);
  return sha256Hex(`${truncated}|${ua}|${day}|${env.TOKEN_SECRET.slice(0, 8)}`);
}

async function rateLimit(env: Env, key: string, limit: number, ttlSeconds: number): Promise<boolean> {
  const current = parseInt((await env.RATE_KV.get(key)) ?? "0", 10);
  if (current >= limit) return false;
  await env.RATE_KV.put(key, String(current + 1), { expirationTtl: ttlSeconds });
  return true;
}

// ---------- tool implementations ----------

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
function err(message: string): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify({ error: message }) }], isError: true };
}

const sps: any[] = (catalog as any).superpowers;

const readTools: Record<string, (args: any) => ToolResult> = {
  search_superpowers: (args) => {
    const q = String(args?.query ?? "").toLowerCase().trim();
    const cat = args?.category ? String(args.category).toLowerCase() : null;
    const scored = sps
      .filter((s) => !cat || s.category.toLowerCase() === cat)
      .map((s) => {
        const hay = `${s.title} ${s.oneLineJob} ${s.description} ${(s.triggers || []).join(" ")}`.toLowerCase();
        const terms = q.split(/\s+/).filter(Boolean);
        const hits = terms.filter((t) => hay.includes(t)).length;
        return { s, hits };
      })
      .filter((x) => q === "" || x.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 5)
      .map((x) => ({ id: x.s.id, title: x.s.title, oneLineJob: x.s.oneLineJob, category: x.s.category, introducedIn: x.s.introducedIn }));
    return ok({
      results: scored,
      caveat: "This is the current public catalogue. What is installed locally is decided by the plugin's own catalogue; a skill listed here arrives via plugin update if not installed.",
      currentPluginVersion: PLUGIN_VERSION,
    });
  },
  get_superpower: (args) => {
    const s = sps.find((x) => x.id === args?.id);
    if (!s) return err(`No superpower with id '${args?.id}'.`);
    return ok(s);
  },
  get_whats_new: (args) => {
    const installed = String(args?.installedVersion ?? "");
    const all: any[] = (releases as any).releases;
    const newer = installed ? all.filter((r) => compareSemver(r.version, installed) > 0) : all;
    return ok({ installedVersion: installed || "unknown", currentVersion: PLUGIN_VERSION, releasesAfterInstalled: newer });
  },
  get_install_help: (args) => {
    const client = String(args?.client ?? "").toLowerCase();
    const help: Record<string, string> = {
      "claude-code": "Add the marketplace: /plugin marketplace add nahiddotai/operator-superpowers — then install: /plugin install operator-superpowers@nahiddotai. Restart or start a new session after install or update. Docs: docs/INSTALL-CLAUDE.md in the repository.",
      codex: "Add the nahiddotai Git marketplace in your plugin settings, install Operator Superpowers, and start a new task. After releases, refresh the marketplace and update; installed plugins are cached, so a reinstall plus a new task may be needed. Docs: docs/INSTALL-CODEX.md in the repository.",
      "chatgpt-work": "Install through the plugin surface where your workspace exposes it. If you do not see plugins, your surface or workspace may not support them yet; use Codex or Claude Code instead. Docs: docs/INSTALL-CODEX.md in the repository.",
    };
    return ok({ client: client || "unspecified", instructions: help[client] ?? Object.values(help).join("\n\n"), troubleshooting: "docs/TROUBLESHOOTING.md in the repository" });
  },
  get_product_status: () => ok({ service: "healthy", currentPluginVersion: PLUGIN_VERSION, marketplace: "github.com/nahiddotai/operator-superpowers" }),
};

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

function validatePayload(action: string, raw: any): { payload: Record<string, unknown> } | { error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "payload must be an object" };
  const allowed = action === "submit_feedback" ? ["skillId", "rating", "note"] : ["job", "category"];
  const required = action === "submit_feedback" ? ["skillId"] : ["job"];
  const keys = Object.keys(raw);
  const unknown = keys.filter((k) => !allowed.includes(k));
  if (unknown.length) return { error: `undeclared fields rejected: ${unknown.join(", ")}` };
  for (const r of required) if (!(r in raw)) return { error: `missing required field: ${r}` };
  if (action === "submit_feedback") {
    if (!sps.some((s) => s.id === raw.skillId)) return { error: `unknown skillId: ${raw.skillId}` };
    if ("rating" in raw && (!Number.isInteger(raw.rating) || raw.rating < 1 || raw.rating > 5)) return { error: "rating must be an integer 1-5" };
    if ("note" in raw && (typeof raw.note !== "string" || raw.note.length > NOTE_MAX)) return { error: `note must be a string of at most ${NOTE_MAX} characters` };
  } else {
    if (typeof raw.job !== "string" || raw.job.length < 10 || raw.job.length > NOTE_MAX) return { error: `job must be a string of 10 to ${NOTE_MAX} characters` };
    if ("category" in raw && (typeof raw.category !== "string" || raw.category.length > 100)) return { error: "category must be a short string" };
  }
  if (canonicalJson(raw).length > PAYLOAD_MAX_BYTES) return { error: "payload too large" };
  return { payload: raw };
}

async function prepare(env: Env, action: string, args: any): Promise<ToolResult> {
  const v = validatePayload(action, args?.payload ?? args);
  if ("error" in v) return err(v.error);
  const payloadHash = "sha256:" + (await sha256Hex(canonicalJson(v.payload)));
  const expiresEpoch = Date.now() + TOKEN_TTL_MS;
  const expiresAt = new Date(expiresEpoch).toISOString();
  // Token segments are dot-separated; epoch ms keeps the middle segment dot-free.
  const confirmationToken = `${action}.${expiresEpoch}.` + (await hmac(env.TOKEN_SECRET, `${action}|${payloadHash}|${expiresEpoch}`));
  return ok({
    status: "approval_required",
    action,
    payload: v.payload,
    payloadHash,
    confirmationToken,
    expiresAt,
    instruction: "Show this exact payload to the user and obtain explicit approval before submission. Any change requires preparing again.",
  });
}

async function submit(env: Env, action: string, args: any, fp: string): Promise<ToolResult> {
  if (env.WRITES_ENABLED !== "true") return err("Submissions are temporarily disabled. Your prepared text is safe to copy and retry later.");
  const { payload, payloadHash, confirmationToken } = args ?? {};
  if (!payload || !payloadHash || !confirmationToken) return err("Missing confirmation data. Run the preparation step first and show the user the exact payload.");
  const v = validatePayload(action, payload);
  if ("error" in v) return err(v.error);
  const expectedHash = "sha256:" + (await sha256Hex(canonicalJson(payload)));
  if (expectedHash !== payloadHash) return err("Payload does not match its hash. Prepare again and get fresh approval.");
  const parts = String(confirmationToken).split(".");
  if (parts.length !== 3 || parts[0] !== action) return err("Confirmation token does not match this action. Prepare again.");
  const [, expiresEpoch, sig] = parts;
  if (!/^\d+$/.test(expiresEpoch) || Number(expiresEpoch) < Date.now()) return err("Confirmation token expired. Prepare again and get fresh approval.");
  const expectedSig = await hmac(env.TOKEN_SECRET, `${action}|${payloadHash}|${expiresEpoch}`);
  if (!timingSafeEqual(sig, expectedSig)) return err("Invalid confirmation token. Prepare again.");
  // Single use: a token that already submitted cannot submit again.
  const usedKey = `used-token:${sig}`;
  if (await env.RATE_KV.get(usedKey)) return err("This confirmation token was already used. Prepare again and get fresh approval for a new submission.");
  await env.RATE_KV.put(usedKey, "1", { expirationTtl: Math.max(60, Math.ceil((Number(expiresEpoch) - Date.now()) / 1000) + 60) });

  const globalOk = await rateLimit(env, `global-writes:${new Date().toISOString().slice(0, 10)}`, GLOBAL_WRITES_PER_DAY, 86400);
  if (!globalOk) return err("The service has reached its daily submission limit. Please retry tomorrow; your text is safe to copy.");

  const id = crypto.randomUUID();
  const deletionToken = crypto.randomUUID();
  const deletionTokenHash = await hmac(env.TOKEN_SECRET, deletionToken);
  const type = action === "submit_feedback" ? "feedback" : "request";
  await env.DB.prepare(
    "INSERT INTO submissions (id, type, skill_id, rating, note, job, category, created_at, deletion_token_hash, plugin_version) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    id, type,
    (payload as any).skillId ?? null, (payload as any).rating ?? null, (payload as any).note ?? null,
    (payload as any).job ?? null, (payload as any).category ?? null,
    new Date().toISOString(), deletionTokenHash, PLUGIN_VERSION
  ).run();

  return ok({
    status: "stored",
    receiptId: id,
    deletionToken,
    deletionTokenNotice: "Shown once. Save it if you may want to delete this submission later.",
    storedFields: payload,
    retention: RETENTION,
  });
}

async function deleteSubmission(env: Env, args: any): Promise<ToolResult> {
  if (env.WRITES_ENABLED !== "true") return err("Deletion is temporarily disabled; please retry later.");
  const { receiptId, deletionToken } = args ?? {};
  if (!receiptId || !deletionToken) return err("Deletion needs both the receipt id and the deletion token.");
  const row = await env.DB.prepare("SELECT id, type, skill_id, job, created_at, deletion_token_hash FROM submissions WHERE id = ?").bind(receiptId).first();
  if (!row) return err("No submission found for that receipt id. It may already be deleted.");
  const expected = await hmac(env.TOKEN_SECRET, String(deletionToken));
  if (!timingSafeEqual(String(row.deletion_token_hash), expected)) return err("Deletion token does not match this submission.");
  await env.DB.prepare("DELETE FROM submissions WHERE id = ?").bind(receiptId).run();
  return ok({ status: "deleted", deletedRecord: { id: row.id, type: row.type, createdAt: row.created_at } });
}

// ---------- MCP tool + resource declarations ----------

const TOOL_DEFS = [
  { name: "search_superpowers", description: "Search the current public Operator Superpowers catalogue. Returns ranked results with an installed-version caveat.", inputSchema: { type: "object", properties: { query: { type: "string" }, category: { type: "string" }, client: { type: "string" } }, required: ["query"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_superpower", description: "Get public metadata for one superpower by id.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_whats_new", description: "List releases newer than the caller's installed version.", inputSchema: { type: "object", properties: { installedVersion: { type: "string" } }, required: ["installedVersion"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_install_help", description: "Verified install, update, and troubleshooting instructions per client.", inputSchema: { type: "object", properties: { client: { type: "string" }, errorCategory: { type: "string" } } }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "get_product_status", description: "Service health, current plugin release, and marketplace availability.", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "prepare_feedback", description: "Validate and normalise user-supplied feedback WITHOUT submitting. Returns the exact payload, hash, expiry, and confirmation token to show the user for approval.", inputSchema: { type: "object", properties: { payload: { type: "object", properties: { skillId: { type: "string" }, rating: { type: "integer", minimum: 1, maximum: 5 }, note: { type: "string", maxLength: NOTE_MAX } }, required: ["skillId"] } }, required: ["payload"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "submit_feedback", description: "Persist feedback the user explicitly approved. Requires the unmodified payload, its hash, and a valid confirmation token from prepare_feedback.", inputSchema: { type: "object", properties: { payload: { type: "object" }, payloadHash: { type: "string" }, confirmationToken: { type: "string" } }, required: ["payload", "payloadHash", "confirmationToken"] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
  { name: "prepare_superpower_request", description: "Turn a missing job into a minimal request payload WITHOUT submitting. Returns the exact payload, hash, expiry, and confirmation token to show the user for approval.", inputSchema: { type: "object", properties: { payload: { type: "object", properties: { job: { type: "string", maxLength: NOTE_MAX }, category: { type: "string" } }, required: ["job"] } }, required: ["payload"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "submit_superpower_request", description: "Persist a superpower request the user explicitly approved. Requires the unmodified payload, its hash, and a valid confirmation token from prepare_superpower_request.", inputSchema: { type: "object", properties: { payload: { type: "object" }, payloadHash: { type: "string" }, confirmationToken: { type: "string" } }, required: ["payload", "payloadHash", "confirmationToken"] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
  { name: "delete_my_submission", description: "Delete a stored submission. Requires the receipt id and the deletion token shown once at submission time.", inputSchema: { type: "object", properties: { receiptId: { type: "string" }, deletionToken: { type: "string" } }, required: ["receiptId", "deletionToken"] }, annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true } },
];

const RESOURCES = [
  { uri: "nahiddotai://catalog/current", name: "Current public catalogue", mimeType: "application/json" },
  { uri: "nahiddotai://releases/latest", name: "Latest release", mimeType: "application/json" },
  { uri: "nahiddotai://status", name: "Service status", mimeType: "application/json" },
];

function readResource(uri: string): string | null {
  if (uri === "nahiddotai://catalog/current") return JSON.stringify(catalog);
  if (uri === "nahiddotai://releases/latest") return JSON.stringify((releases as any).releases[0] ?? {});
  if (uri === "nahiddotai://status") return JSON.stringify({ service: "healthy", currentPluginVersion: PLUGIN_VERSION });
  const m = uri.match(/^nahiddotai:\/\/releases\/(.+)$/);
  if (m) {
    const r = (releases as any).releases.find((x: any) => x.version === m[1]);
    return r ? JSON.stringify(r) : null;
  }
  return null;
}

// ---------- JSON-RPC over Streamable HTTP ----------

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleRpc(env: Env, req: Request, msg: any): Promise<object | null> {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "operator_superpowers", version: PLUGIN_VERSION },
        instructions: "Live catalogue, release, and install information for Operator Superpowers, plus explicitly approved feedback and requests. The installed plugin's native skills never require this server.",
      });
    case "notifications/initialized":
      return null;
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: TOOL_DEFS });
    case "resources/list":
      return rpcResult(id, { resources: RESOURCES });
    case "resources/read": {
      const text = readResource(String(params?.uri ?? ""));
      if (text === null) return rpcError(id, -32602, "Unknown resource");
      return rpcResult(id, { contents: [{ uri: params.uri, mimeType: "application/json", text }] });
    }
    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = params?.arguments ?? {};
      const fp = await fingerprint(req, env);
      let result: ToolResult;
      if (name in readTools || name.startsWith("prepare_")) {
        const allowed = await rateLimit(env, `reads:${fp}:${Math.floor(Date.now() / 60000)}`, READS_PER_MINUTE, 120);
        if (!allowed) result = err("Rate limited. Try again in a minute.");
        else if (name in readTools) result = readTools[name](args);
        else result = await prepare(env, name.replace("prepare_feedback", "submit_feedback").replace("prepare_superpower_request", "submit_superpower_request"), args);
      } else if (name === "submit_feedback" || name === "submit_superpower_request" || name === "delete_my_submission") {
        const allowed = await rateLimit(env, `writes:${fp}:${new Date().toISOString().slice(0, 10)}`, WRITES_PER_DAY, 86400);
        if (!allowed) result = err("Daily submission limit reached for this connection. Your text is safe to copy and retry tomorrow.");
        else if (name === "delete_my_submission") result = await deleteSubmission(env, args);
        else result = await submit(env, name, args, fp);
      } else {
        return rpcError(id, -32602, `Unknown tool: ${name}`);
      }
      return rpcResult(id, result);
    }
    default:
      return id === undefined ? null : rpcError(id, -32601, `Method not found: ${method}`);
  }
}

// ---------- anonymous usage metrics ----------
// POST /t accepts one fixed-shape event and nothing else. No IPs stored;
// country comes from Cloudflare's edge metadata. See docs/PRIVACY.md.

const TELEMETRY_EVENTS = new Set(["install", "heartbeat", "skill_run"]);

async function handleTelemetry(req: Request, env: Env): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const { installId, event, skill, client, os, version } = body ?? {};
  if (typeof installId !== "string" || !/^[a-f0-9-]{8,64}$/i.test(installId)) return new Response(null, { status: 400 });
  if (!TELEMETRY_EVENTS.has(event)) return new Response(null, { status: 400 });
  const knownSkill = skill == null ? null : sps.some((s) => s.id === skill) ? skill : null;
  if (event === "skill_run" && !knownSkill) return new Response(null, { status: 400 });
  const safe = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max).replace(/[^\w.-]/g, "") : "unknown");
  const clientSafe = safe(client, 24) || "unknown";
  const osSafe = safe(os, 16) || "unknown";
  const versionSafe = safe(version, 16) || "unknown";
  const country = (req as any).cf?.country ?? "XX";

  const fp = await fingerprint(req, env);
  const allowed = await rateLimit(env, `t:${fp}:${new Date().toISOString().slice(0, 10)}`, 300, 86400);
  if (!allowed) return new Response(null, { status: 429 });

  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const writes = [
    env.DB.prepare(
      `INSERT INTO telemetry_installs (install_id, first_seen, last_seen, client, os, version, country)
       VALUES (?,?,?,?,?,?,?)
       ON CONFLICT(install_id) DO UPDATE SET last_seen=excluded.last_seen, client=excluded.client, os=excluded.os, version=excluded.version, country=excluded.country`
    ).bind(installId, now, now, clientSafe, osSafe, versionSafe, country),
    env.DB.prepare(
      `INSERT INTO telemetry_daily (day, event, skill, client, country, version, count)
       VALUES (?,?,?,?,?,?,1)
       ON CONFLICT(day, event, skill, client, country, version) DO UPDATE SET count = count + 1`
    ).bind(day, event, knownSkill ?? "", clientSafe, country, versionSafe),
  ];
  if (event === "skill_run" && knownSkill) {
    writes.push(
      env.DB.prepare(
        `INSERT INTO telemetry_skill_installs (install_id, skill, first_run, last_run, runs)
         VALUES (?,?,?,?,1)
         ON CONFLICT(install_id, skill) DO UPDATE SET last_run=excluded.last_run, runs = runs + 1`
      ).bind(installId, knownSkill, now, now)
    );
  }
  await env.DB.batch(writes);
  return new Response(null, { status: 204 });
}

async function handleStats(req: Request, env: Env): Promise<Response> {
  if (!env.STATS_KEY || req.headers.get("x-stats-key") !== env.STATS_KEY) return new Response("Forbidden", { status: 403 });
  const q = async (sql: string, ...binds: unknown[]) => (await env.DB.prepare(sql).bind(...binds).all()).results;
  const cutoff7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const cutoff30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const day30 = cutoff30.slice(0, 10);
  const cutoff14 = new Date(Date.now() - 14 * 864e5).toISOString();
  const day7 = cutoff7.slice(0, 10);
  const day14 = cutoff14.slice(0, 10);
  const [totals, active, countries, clients, versions, topSkills, daily, submissions,
         growthWeekly, skillEngagement, gateway, timeToFirstRun, skillsThisWeek, skillsLastWeek] = await Promise.all([
    q("SELECT COUNT(*) AS installs FROM telemetry_installs"),
    q("SELECT SUM(CASE WHEN last_seen >= ? THEN 1 ELSE 0 END) AS active_7d, SUM(CASE WHEN last_seen >= ? THEN 1 ELSE 0 END) AS active_30d, SUM(CASE WHEN last_seen < ? THEN 1 ELSE 0 END) AS dormant_30d FROM telemetry_installs", cutoff7, cutoff30, cutoff30),
    q("SELECT country, COUNT(*) AS installs FROM telemetry_installs GROUP BY country ORDER BY installs DESC LIMIT 20"),
    q("SELECT client, COUNT(*) AS installs FROM telemetry_installs GROUP BY client ORDER BY installs DESC"),
    q("SELECT version, COUNT(*) AS installs, SUM(CASE WHEN last_seen >= ? THEN 1 ELSE 0 END) AS active_7d FROM telemetry_installs GROUP BY version ORDER BY installs DESC LIMIT 10", cutoff7),
    q("SELECT skill, SUM(count) AS runs FROM telemetry_daily WHERE event='skill_run' AND day >= ? GROUP BY skill ORDER BY runs DESC", day30),
    q("SELECT day, event, SUM(count) AS count FROM telemetry_daily WHERE day >= ? GROUP BY day, event ORDER BY day", day30),
    q("SELECT type, COUNT(*) AS count FROM submissions GROUP BY type"),
    // Install growth by ISO week of first_seen (last ~12 weeks).
    q("SELECT substr(first_seen,1,10) AS day, COUNT(*) AS installs FROM telemetry_installs WHERE first_seen >= ? GROUP BY substr(first_seen,1,10) ORDER BY day", new Date(Date.now() - 84 * 864e5).toISOString()),
    // Per-skill engagement: reach, depth, and repeat rate.
    q(`SELECT skill, COUNT(*) AS unique_installs, SUM(runs) AS total_runs,
              SUM(CASE WHEN runs >= 2 THEN 1 ELSE 0 END) AS repeat_installs,
              ROUND(1.0 * SUM(CASE WHEN runs >= 2 THEN 1 ELSE 0 END) / COUNT(*), 2) AS repeat_rate
       FROM telemetry_skill_installs GROUP BY skill ORDER BY unique_installs DESC`),
    // Gateway skill: which skill is most often an install's FIRST run.
    q(`SELECT skill, COUNT(*) AS first_runs FROM (
         SELECT install_id, skill, MIN(first_run) AS fr FROM telemetry_skill_installs GROUP BY install_id
       ) GROUP BY skill ORDER BY first_runs DESC`),
    // Median-ish days from install to first skill run (bucketed).
    q(`SELECT CASE
           WHEN julianday(f.fr) - julianday(i.first_seen) < 1 THEN 'same-day'
           WHEN julianday(f.fr) - julianday(i.first_seen) < 7 THEN 'within-week'
           ELSE 'later' END AS bucket, COUNT(*) AS installs
       FROM telemetry_installs i
       JOIN (SELECT install_id, MIN(first_run) AS fr FROM telemetry_skill_installs GROUP BY install_id) f
         ON f.install_id = i.install_id
       GROUP BY bucket`),
    q("SELECT skill, SUM(count) AS runs FROM telemetry_daily WHERE event='skill_run' AND day >= ? GROUP BY skill", day7),
    q("SELECT skill, SUM(count) AS runs FROM telemetry_daily WHERE event='skill_run' AND day >= ? AND day < ? GROUP BY skill", day14, day7),
  ]);
  // Week-over-week deltas per skill: the raw material for data-driven content.
  const lastMap = new Map((skillsLastWeek as any[]).map((r) => [r.skill, Number(r.runs)]));
  const weekOverWeek = (skillsThisWeek as any[]).map((r) => {
    const prev = lastMap.get(r.skill) ?? 0;
    return { skill: r.skill, thisWeek: Number(r.runs), lastWeek: prev, delta: Number(r.runs) - prev };
  }).sort((a, b) => b.delta - a.delta);
  return Response.json({
    generatedAt: new Date().toISOString(),
    installsTotal: (totals[0] as any)?.installs ?? 0,
    active: active[0] ?? {},
    installGrowthByDay: growthWeekly,
    byCountry: countries,
    byClient: clients,
    byVersion: versions,
    topSkills30d: topSkills,
    skillEngagement,
    gatewaySkills: gateway,
    timeToFirstSkillRun: timeToFirstRun,
    skillRunsWeekOverWeek: weekOverWeek,
    daily30d: daily,
    feedbackAndRequests: submissions,
  });
}

// Owner dashboard: static HTML, no data baked in. The page asks for the stats
// key once (kept in the browser's localStorage) and calls /stats with it.
const DASHBOARD_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Operator Superpowers — metrics</title>
<style>
:root{--bg:#0f1222;--card:#181c30;--ink:#e8e6f0;--dim:#8a87a0;--accent:#7c6cf0;--good:#4fc38a;--bad:#e06c75}
*{box-sizing:border-box;margin:0}body{background:var(--bg);color:var(--ink);font:15px/1.5 ui-sans-serif,system-ui;padding:24px;max-width:1080px;margin:0 auto}
h1{font-size:20px;margin-bottom:4px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);margin:0 0 10px}
.sub{color:var(--dim);margin-bottom:20px;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
.card{background:var(--card);border-radius:12px;padding:16px;overflow-x:auto}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:14px}
.tile{background:var(--card);border-radius:12px;padding:14px}.tile .n{font-size:26px;font-weight:700}.tile .l{font-size:12px;color:var(--dim)}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{text-align:left;padding:4px 10px 4px 0;border-bottom:1px solid #262a42}th{color:var(--dim);font-weight:500}
td.num,th.num{text-align:right}
.delta-up{color:var(--good)}.delta-down{color:var(--bad)}
#gate{margin:40px auto;max-width:420px;text-align:center}input{background:var(--card);border:1px solid #2c3050;color:var(--ink);border-radius:8px;padding:10px 12px;width:100%;margin:10px 0}
button{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:10px 18px;cursor:pointer;font-size:14px}
#err{color:var(--bad);font-size:13px;margin-top:8px}
</style></head><body>
<div id="gate"><h1>Operator Superpowers metrics</h1><p class="sub">Paste the stats key (from mcp-service/.stats-key). Stored only in this browser.</p>
<input id="key" type="password" placeholder="stats key"><button onclick="saveKey()">Open dashboard</button><div id="err"></div></div>
<div id="dash" style="display:none">
<h1>Operator Superpowers</h1><div class="sub" id="stamp"></div>
<div class="tiles" id="tiles"></div>
<div class="grid" id="cards"></div>
</div>
<script>
const $=id=>document.getElementById(id);
function saveKey(){localStorage.setItem("statsKey",$("key").value.trim());load()}
function tile(n,l){return '<div class="tile"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>'}
function table(title,rows,cols){
 if(!rows||!rows.length)return '<div class="card"><h2>'+title+'</h2><p class="sub">No data yet.</p></div>';
 let h='<div class="card"><h2>'+title+'</h2><table><tr>'+cols.map(c=>'<th class="'+(c.num?'num':'')+'">'+c.label+'</th>').join('')+'</tr>';
 for(const r of rows){h+='<tr>'+cols.map(c=>{let v=r[c.key];if(c.fmt)v=c.fmt(v,r);return '<td class="'+(c.num?'num':'')+'">'+(v??'')+'</td>'}).join('')+'</tr>'}
 return h+'</table></div>'}
async function load(){
 const key=localStorage.getItem("statsKey");if(!key)return;
 const res=await fetch("/stats",{headers:{"x-stats-key":key}});
 if(!res.ok){$("gate").style.display="block";$("dash").style.display="none";$("err").textContent="That key was rejected ("+res.status+").";localStorage.removeItem("statsKey");return}
 const d=await res.json();
 $("gate").style.display="none";$("dash").style.display="block";
 $("stamp").textContent="Generated "+d.generatedAt;
 const a=d.active||{};
 $("tiles").innerHTML=tile(d.installsTotal,"installs")+tile(a.active_7d??0,"active, 7 days")+tile(a.active_30d??0,"active, 30 days")+tile(a.dormant_30d??0,"dormant 30+ days")+tile((d.byCountry||[]).length,"countries");
 const delta=(v,r)=>{const c=r.delta>0?"delta-up":(r.delta<0?"delta-down":"");const s=r.delta>0?"+"+r.delta:r.delta;return '<span class="'+c+'">'+s+'</span>'};
 $("cards").innerHTML=
  table("Skill runs, week over week (content angles live here)",d.skillRunsWeekOverWeek,[{key:"skill",label:"Skill"},{key:"thisWeek",label:"This wk",num:1},{key:"lastWeek",label:"Last wk",num:1},{key:"delta",label:"Δ",num:1,fmt:delta}])+
  table("Skill engagement (repeat rate = comes back)",d.skillEngagement,[{key:"skill",label:"Skill"},{key:"unique_installs",label:"Users",num:1},{key:"total_runs",label:"Runs",num:1},{key:"repeat_rate",label:"Repeat",num:1}])+
  table("Gateway skills (the first thing people run)",d.gatewaySkills,[{key:"skill",label:"Skill"},{key:"first_runs",label:"First runs",num:1}])+
  table("Time from install to first skill run",d.timeToFirstSkillRun,[{key:"bucket",label:"When"},{key:"installs",label:"Installs",num:1}])+
  table("Top skills, 30 days",d.topSkills30d,[{key:"skill",label:"Skill"},{key:"runs",label:"Runs",num:1}])+
  table("By client",d.byClient,[{key:"client",label:"Client"},{key:"installs",label:"Installs",num:1}])+
  table("By version (are updates landing?)",d.byVersion,[{key:"version",label:"Version"},{key:"installs",label:"Installs",num:1},{key:"active_7d",label:"Active 7d",num:1}])+
  table("By country",d.byCountry,[{key:"country",label:"Country"},{key:"installs",label:"Installs",num:1}])+
  table("Installs per day (12 weeks)",d.installGrowthByDay,[{key:"day",label:"Day"},{key:"installs",label:"New installs",num:1}])+
  table("Feedback and requests",d.feedbackAndRequests,[{key:"type",label:"Type"},{key:"count",label:"Count",num:1}]);
}
load();
</script></body></html>`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ status: "healthy", version: PLUGIN_VERSION });
    if (url.pathname === "/t" && req.method === "POST") return handleTelemetry(req, env);
    if (url.pathname === "/stats" && req.method === "GET") return handleStats(req, env);
    if (url.pathname === "/dashboard" && req.method === "GET") return new Response(DASHBOARD_HTML, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
    if (url.pathname !== "/mcp") return new Response("Not found", { status: 404 });
    if (req.method === "GET") return new Response(null, { status: 405 }); // no server-initiated stream
    if (req.method !== "POST") return new Response(null, { status: 405 });
    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json(rpcError(null, -32700, "Parse error"), { status: 400 });
    }
    const messages = Array.isArray(body) ? body : [body];
    const responses = (await Promise.all(messages.map((m) => handleRpc(env, req, m)))).filter((r) => r !== null);
    if (responses.length === 0) return new Response(null, { status: 202 });
    return Response.json(Array.isArray(body) ? responses : responses[0]);
  },
};
