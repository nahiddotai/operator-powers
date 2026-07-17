/**
 * nahiddotai_superpowers companion MCP service.
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
      "claude-code": "Add the marketplace: /plugin marketplace add nahiddotai/nahids-superpowers — then install: /plugin install nahids-superpowers@nahiddotai. Restart or start a new session after install or update. Docs: docs/INSTALL-CLAUDE.md in the repository.",
      codex: "Add the nahiddotai Git marketplace in your plugin settings, install Nahid's Superpowers, and start a new task. After releases, refresh the marketplace and update; installed plugins are cached, so a reinstall plus a new task may be needed. Docs: docs/INSTALL-CODEX.md in the repository.",
      "chatgpt-work": "Install through the plugin surface where your workspace exposes it. If you do not see plugins, your surface or workspace may not support them yet; use Codex or Claude Code instead. Docs: docs/INSTALL-CODEX.md in the repository.",
    };
    return ok({ client: client || "unspecified", instructions: help[client] ?? Object.values(help).join("\n\n"), troubleshooting: "docs/TROUBLESHOOTING.md in the repository" });
  },
  get_product_status: () => ok({ service: "healthy", currentPluginVersion: PLUGIN_VERSION, marketplace: "github.com/nahiddotai/nahids-superpowers" }),
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
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const confirmationToken = `${action}.${expiresAt}.` + (await hmac(env.TOKEN_SECRET, `${action}|${payloadHash}|${expiresAt}`));
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
  const [, expiresAt, sig] = parts;
  if (new Date(expiresAt).getTime() < Date.now()) return err("Confirmation token expired. Prepare again and get fresh approval.");
  const expectedSig = await hmac(env.TOKEN_SECRET, `${action}|${payloadHash}|${expiresAt}`);
  if (!timingSafeEqual(sig, expectedSig)) return err("Invalid confirmation token. Prepare again.");

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
  { name: "search_superpowers", description: "Search the current public Nahid's Superpowers catalogue. Returns ranked results with an installed-version caveat.", inputSchema: { type: "object", properties: { query: { type: "string" }, category: { type: "string" }, client: { type: "string" } }, required: ["query"] }, annotations: { readOnlyHint: true, openWorldHint: false } },
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
        serverInfo: { name: "nahiddotai_superpowers", version: PLUGIN_VERSION },
        instructions: "Live catalogue, release, and install information for Nahid's Superpowers, plus explicitly approved feedback and requests. The installed plugin's native skills never require this server.",
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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ status: "healthy", version: PLUGIN_VERSION });
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
