#!/usr/bin/env node
// Deterministic tests for the hook runner. No third-party deps.
// Uses a temp HOME so the user's real state is never touched.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(HERE, "..", "hook-runner", "index.mjs");
let pass = 0, fail = 0;

function run(cmd, stdinObj, home, extraEnv = {}) {
  const res = spawnSync(process.execPath, [RUNNER, cmd], {
    input: stdinObj === undefined ? "" : JSON.stringify(stdinObj),
    // Telemetry is disabled for the whole suite (empty URL) unless a test
    // explicitly points it at the local mock server.
    env: { ...process.env, HOME: home, OPERATOR_SUPERPOWERS_TELEMETRY_URL: "", ...extraEnv },
    encoding: "utf8",
    timeout: 5000,
  });
  return { out: res.stdout || "", code: res.status };
}

function check(name, cond) {
  if (cond) { pass++; console.log(`  ok: ${name}`); }
  else { fail++; console.error(`FAIL: ${name}`); }
}

function freshHome() { return mkdtempSync(join(tmpdir(), "nsp-test-")); }
const statePath = (home) => join(home, ".operator-superpowers", "state.json");

// --- session-start ---
{
  const home = freshHome();
  const first = run("session-start", {}, home);
  check("first install emits orientation", first.out.includes("is installed"));
  check("first install records version", existsSync(statePath(home)) && JSON.parse(readFileSync(statePath(home), "utf8")).lastSeenPluginVersion !== null);
  const second = run("session-start", {}, home);
  check("same version stays silent", second.out === "");
}
{
  const home = freshHome();
  mkdirSync(join(home, ".operator-superpowers"), { recursive: true });
  writeFileSync(statePath(home), JSON.stringify({ schemaVersion: 1, lastSeenPluginVersion: "0.9.0", firstRunCompleted: true, hookPreferences: { discoveryHints: true }, pendingSubmissions: [] }));
  const res = run("session-start", {}, home);
  check("upgrade emits update notice once", res.out.includes("updated to"));
  check("upgrade message points at whats-new", res.out.includes("whats-new"));
  const again = run("session-start", {}, home);
  check("update notice not repeated", again.out === "");
}
{
  const home = freshHome();
  mkdirSync(join(home, ".operator-superpowers"), { recursive: true });
  writeFileSync(statePath(home), "{corrupt json!!");
  const res = run("session-start", {}, home);
  check("corrupt state treated as first run", res.out.includes("is installed"));
}

// --- discover ---
{
  const home = freshHome();
  check("no match stays silent", run("discover", { prompt: "what is the weather in sydney today please" }, home).out === "");
  check("strong match emits hint", run("discover", { prompt: "here is a meeting transcript from yesterday's client call" }, home).out.includes("meeting-miner"));
  check("negative trigger blocks", !run("discover", { prompt: "can you schedule a meeting for tuesday with the team" }, home).out.includes("meeting-miner"));
  check("short prompt ignored", run("discover", { prompt: "hi there" }, home).out === "");
  check("malicious json fails open", run("discover", undefined, home).code === 0);
  const multi = run("discover", { prompt: "turn this meeting transcript into an instagram carousel with carousel slides" }, home);
  const hintCount = (multi.out.match(/installed superpower/g) || []).length;
  check("at most two hints", hintCount <= 2);
  const secret = run("discover", { prompt: "my api key is sk-test-1234567890 please make a skill brief for this repeated task, turn this into a skill" }, home);
  check("prompt with secret is not persisted", !existsSync(statePath(home)) || !readFileSync(statePath(home), "utf8").includes("sk-test"));
  check("secret prompt still processed normally", secret.code === 0);
}

// --- guard-mcp-write ---
{
  const home = freshHome();
  const payload = { skillId: "meeting-miner", rating: 4, note: "useful" };
  const canonical = (v) => v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? "[" + v.map(canonical).join(",") + "]" : "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
  const goodHash = "sha256:" + createHash("sha256").update(canonical(payload)).digest("hex");

  check("unrelated tool passes through", run("guard-mcp-write", { tool_name: "mcp__other_server__submit_feedback_thing", tool_input: {} }, home).out === "" || !run("guard-mcp-write", { tool_name: "Bash", tool_input: {} }, home).out.includes("deny"));
  check("read tool passes through", run("guard-mcp-write", { tool_name: "mcp__operator_superpowers__search_superpowers", tool_input: { query: "x" } }, home).out === "");
  check("missing token denied", run("guard-mcp-write", { tool_name: "mcp__operator_superpowers__submit_feedback", tool_input: { payload } }, home).out.includes("deny"));
  check("hash mismatch denied", run("guard-mcp-write", { tool_name: "mcp__operator_superpowers__submit_feedback", tool_input: { payload: { ...payload, note: "changed after preparation" }, payloadHash: goodHash, confirmationToken: "t" } }, home).out.includes("deny"));
  check("valid submission passes", run("guard-mcp-write", { tool_name: "mcp__operator_superpowers__submit_feedback", tool_input: { payload, payloadHash: goodHash, confirmationToken: "t" } }, home).out === "");
  check("deletion without token denied", run("guard-mcp-write", { tool_name: "mcp__operator_superpowers__delete_my_submission", tool_input: {} }, home).out.includes("deny"));
  check("deletion with credentials passes", run("guard-mcp-write", { tool_name: "mcp__operator_superpowers__delete_my_submission", tool_input: { receiptId: "r1", deletionToken: "d1" } }, home).out === "");
}

// --- unknown subcommand ---
check("unknown subcommand exits silently", run("bogus", {}, freshHome()).out === "" );

// --- telemetry ---
{
  const { createServer } = await import("node:http");
  const pings = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { try { pings.push(JSON.parse(body)); } catch {} res.statusCode = 204; res.end(); });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const T = { OPERATOR_SUPERPOWERS_TELEMETRY_URL: `http://127.0.0.1:${server.address().port}/t` };
  const waitPings = (n) => new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => { if (pings.length >= n || Date.now() - t0 > 4000) { clearInterval(iv); resolve(); } }, 50);
  });

  const home = freshHome();
  run("session-start", {}, home, T);
  await waitPings(1);
  check("first run sends one install event", pings.length === 1 && pings[0].event === "install");
  check("install event has an install id and no content fields", !!pings[0]?.installId && Object.keys(pings[0]).sort().join(",") === "client,event,installId,os,skill,version");
  const st = JSON.parse(readFileSync(statePath(home), "utf8"));
  check("install id persisted in state", st.installId === pings[0].installId);

  run("session-start", {}, home, T);
  await new Promise((r) => setTimeout(r, 600));
  check("same-day second session sends no heartbeat", pings.length === 1);

  run("skill-run", { tool_name: "Skill", tool_input: { skill: "operator-superpowers:meeting-miner" } }, home, T);
  await waitPings(2);
  check("our skill run is counted", pings.length === 2 && pings[1].event === "skill_run" && pings[1].skill === "meeting-miner");

  run("skill-run", { tool_name: "Skill", tool_input: { skill: "someone-elses-skill" } }, home, T);
  await new Promise((r) => setTimeout(r, 600));
  check("other people's skills are never reported", pings.length === 2);

  const before = pings.length;
  writeFileSync(statePath(home), JSON.stringify({ ...JSON.parse(readFileSync(statePath(home), "utf8")), telemetry: false }));
  run("skill-run", { tool_name: "Skill", tool_input: { skill: "operator-superpowers:meeting-miner" } }, home, T);
  await new Promise((r) => setTimeout(r, 600));
  check("state off switch stops all events", pings.length === before);

  const home2 = freshHome();
  run("session-start", {}, home2, { ...T, OPERATOR_SUPERPOWERS_NO_TELEMETRY: "1" });
  await new Promise((r) => setTimeout(r, 600));
  check("env off switch stops all events", pings.length === before);

  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
