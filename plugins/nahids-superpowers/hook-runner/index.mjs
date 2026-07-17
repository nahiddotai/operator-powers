#!/usr/bin/env node
// Nahid's Superpowers hook runner.
// Deterministic, dependency-free, no network, no shell, no transcript access.
// Reads: stdin (host-provided hook JSON), the bundled read-only catalogue,
// and ~/.nahids-superpowers/state.json. Writes: only that state file.
// Subcommands: session-start | discover | guard-mcp-write

import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const PLUGIN_ROOT = dirname(fileURLToPath(new URL(".", import.meta.url)));
const STATE_DIR = join(homedir(), ".nahids-superpowers");
const STATE_FILE = join(STATE_DIR, "state.json");
const MAX_HINTS = 2;

// Every failure fails open (exit 0, no output) except the write guard,
// which emits an explicit deny when its checks fail.
function readStdin() {
  try {
    const raw = readFileSync(0, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function loadState() {
  const s = readJson(STATE_FILE);
  if (!s || typeof s !== "object" || s.schemaVersion !== 1) {
    return { schemaVersion: 1, lastSeenPluginVersion: null, firstRunCompleted: false, hookPreferences: { discoveryHints: true }, pendingSubmissions: [] };
  }
  return s;
}

function saveState(state) {
  try {
    mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
    const tmp = STATE_FILE + ".tmp";
    writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
    renameSync(tmp, STATE_FILE);
  } catch {
    // State persistence is best-effort; never fail the session over it.
  }
}

function emitContext(eventName, text) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: eventName, additionalContext: text } }));
}

function sessionStart() {
  const release = readJson(join(PLUGIN_ROOT, "catalog", "release.json"));
  if (!release || typeof release.version !== "string") return;
  const state = loadState();
  const installed = release.version;
  const lastSeen = state.lastSeenPluginVersion;

  if (lastSeen === installed) return; // Nothing new; stay silent.

  let message;
  if (lastSeen === null) {
    message = "Nahid's Superpowers is installed. Ask for the job you want done or run start-here. Skills work locally; live catalogue and feedback features may contact the companion service only with your approval.";
  } else {
    const entry = Array.isArray(release.releases) ? release.releases.find((r) => r && r.version === installed) : null;
    const added = entry && Array.isArray(entry.new) ? entry.new.length : 0;
    const summary = added > 0 ? ` ${added} addition${added === 1 ? "" : "s"} in this release.` : "";
    message = `Nahid's Superpowers updated to ${installed}.${summary} Run whats-new for details.`;
  }

  state.lastSeenPluginVersion = installed;
  state.firstRunCompleted = true;
  saveState(state);
  emitContext("SessionStart", message);
}

function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, " ").trim();
}

function discover() {
  const input = readStdin();
  const prompt = normalize(input.prompt || "");
  if (!prompt || prompt.length < 12) return; // Too short to be a job description.

  const state = loadState();
  if (state.hookPreferences && state.hookPreferences.discoveryHints === false) return;

  const catalog = readJson(join(PLUGIN_ROOT, "catalog", "superpowers.json"));
  if (!catalog || !Array.isArray(catalog.superpowers)) return;

  const matches = [];
  for (const sp of catalog.superpowers) {
    if (!sp || !Array.isArray(sp.triggers)) continue;
    if (Array.isArray(sp.negativeTriggers) && sp.negativeTriggers.some((t) => prompt.includes(normalize(t)))) continue;
    // High confidence only: a multi-word trigger phrase, or two distinct triggers.
    const hits = sp.triggers.filter((t) => prompt.includes(normalize(t)));
    const strong = hits.some((t) => normalize(t).includes(" ")) || hits.length >= 2;
    if (strong) matches.push({ id: sp.id, job: sp.oneLineJob, hits: hits.length });
  }
  if (matches.length === 0) return;

  matches.sort((a, b) => b.hits - a.hits);
  const top = matches.slice(0, MAX_HINTS);
  const lines = top.map((m) => `${m.job} (installed superpower: ${m.id})`).join(" | ");
  emitContext("UserPromptSubmit", `Possibly relevant from Nahid's Superpowers: ${lines}. Use only if it genuinely fits the user's request.`);
  // The prompt was processed in memory only; nothing is persisted or transmitted.
}

const WRITE_TOOL_SUFFIXES = ["submit_feedback", "submit_superpower_request", "delete_my_submission"];

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + canonicalJson(value[k])).join(",") + "}";
}

function guardMcpWrite() {
  const input = readStdin();
  const toolName = String(input.tool_name || "");
  // Only this plugin's MCP write tools are guarded; everything else passes untouched.
  const isOurs = toolName.includes("nahiddotai_superpowers");
  const isWrite = WRITE_TOOL_SUFFIXES.some((s) => toolName.endsWith(s));
  if (!isOurs || !isWrite) return;

  const deny = (reason) => {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } }));
  };

  const args = input.tool_input || {};

  if (toolName.endsWith("delete_my_submission")) {
    if (!args.receiptId || !args.deletionToken) {
      deny("Deletion needs a receipt id and deletion token. Ask the user for both, show what will be deleted, and confirm first.");
    }
    return;
  }

  if (!args.confirmationToken || !args.payloadHash || !args.payload) {
    deny("This submission is missing its confirmation data. Run the preparation step first, show the user the exact payload, and get their explicit approval.");
    return;
  }
  const digest = "sha256:" + createHash("sha256").update(canonicalJson(args.payload)).digest("hex");
  if (digest !== args.payloadHash) {
    deny("The payload changed after it was prepared and shown to the user. Prepare again, show the new payload, and get fresh approval.");
    return;
  }
  // Token validity and expiry are enforced by the server; the hook checks presence and payload integrity.
}

const cmd = process.argv[2];
try {
  if (cmd === "session-start") sessionStart();
  else if (cmd === "discover") discover();
  else if (cmd === "guard-mcp-write") guardMcpWrite();
  // Unknown subcommands exit silently; the runner accepts only the three fixed commands.
} catch {
  process.exitCode = 0; // Fail open; never break the user's session.
}
