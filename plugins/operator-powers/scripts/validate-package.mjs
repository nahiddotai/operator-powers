#!/usr/bin/env node
// Static validation for the whole package. Run from anywhere; exits non-zero on any failure.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(PLUGIN, "..", "..");
const errors = [];
const warns = [];
const read = (p) => readFileSync(p, "utf8");
const json = (p) => JSON.parse(read(p));

// --- manifests parse and agree on version ---
const claudeManifest = json(join(PLUGIN, ".claude-plugin", "plugin.json"));
const codexManifest = json(join(PLUGIN, ".codex-plugin", "plugin.json"));
const claudeMarket = json(join(REPO, ".claude-plugin", "marketplace.json"));
const release = json(join(PLUGIN, "catalog", "release.json"));
const versions = {
  "claude plugin.json": claudeManifest.version,
  "codex plugin.json": codexManifest.version,
  "claude marketplace entry": claudeMarket.plugins[0].version,
  "release.json": release.version,
};
const versionSet = new Set(Object.values(versions));
if (versionSet.size !== 1) errors.push(`version mismatch: ${JSON.stringify(versions)}`);
if (!/^\d+\.\d+\.\d+$/.test(release.version)) errors.push(`release version is not semver: ${release.version}`);
const changelog = read(join(PLUGIN, "CHANGELOG.md"));
if (!changelog.includes(`## ${release.version}`)) errors.push(`CHANGELOG.md has no heading for ${release.version}`);
for (const name of ["operator-powers"]) {
  if (claudeManifest.name !== name || codexManifest.name !== name) errors.push("plugin name drifted from operator-powers");
}
const iface = codexManifest.interface ?? {};
if (String(iface.displayName ?? "").length > 30) errors.push("Codex displayName exceeds final directory limit of 30");
if (String(iface.shortDescription ?? "").length > 30) errors.push("Codex shortDescription exceeds final directory limit of 30");
if (String(iface.longDescription ?? "").length > 4000) errors.push("Codex longDescription exceeds final directory limit of 4000");
const openAIListing = read(join(REPO, "submission", "openai", "listing.md"));
if (!/^- Support: `https:\/\//m.test(openAIListing)) errors.push("OpenAI With MCP listing needs an HTTPS support URL");
if (!Array.isArray(iface.defaultPrompt) || iface.defaultPrompt.length > 3 || iface.defaultPrompt.some((prompt) => String(prompt).length > 128)) errors.push("Codex starter prompts must be a list of at most 3 entries, each at most 128 characters");

// --- skill frontmatter ---
const skillsDir = join(PLUGIN, "skills");
const skillIds = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
for (const id of skillIds) {
  const p = join(skillsDir, id, "SKILL.md");
  if (!existsSync(p)) { errors.push(`${id}: missing SKILL.md`); continue; }
  const text = read(p);
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { errors.push(`${id}: missing frontmatter`); continue; }
  const nameMatch = fm[1].match(/^name:\s*(.+)$/m);
  const descMatch = fm[1].match(/^description:\s*(.+)$/m);
  if (!nameMatch || nameMatch[1].trim() !== id) errors.push(`${id}: frontmatter name '${nameMatch?.[1]?.trim()}' does not match folder`);
  if (!descMatch) errors.push(`${id}: missing description`);
  else {
    const desc = descMatch[1].replace(/\n/g, " ").trim();
    if (desc.length > 200) errors.push(`${id}: description ${desc.length} chars (Anthropic directory limit 200)`);
    if (desc.length < 60) warns.push(`${id}: description is very short (${desc.length} chars)`);
  }
}

// --- catalogue integrity ---
const catalog = json(join(PLUGIN, "catalog", "powers.json"));
const catalogIds = catalog.powers.map((s) => s.id);
const categories = json(join(PLUGIN, "catalog", "categories.json")).categories;
const categoryTitles = new Set(categories.map((category) => category.title));
if (new Set(catalogIds).size !== catalogIds.length) errors.push("catalogue contains duplicate power ids");
for (const s of catalog.powers) {
  if (!skillIds.includes(s.id)) errors.push(`catalogue lists '${s.id}' but skills/${s.id} does not exist`);
  const rel = s.skillPath.replace("./", "");
  if (!existsSync(join(PLUGIN, rel, "SKILL.md"))) errors.push(`catalogue skillPath broken for '${s.id}'`);
  for (const k of ["oneLineJob", "description", "category", "triggers", "permissions", "privacy", "introducedIn"]) {
    if (!(k in s)) errors.push(`catalogue '${s.id}' missing field ${k}`);
  }
  if (!categoryTitles.has(s.category)) errors.push(`catalogue '${s.id}' uses unknown category '${s.category}'`);
  if (!Array.isArray(s.negativeTriggers)) errors.push(`catalogue '${s.id}' negativeTriggers must be an array`);
}
for (const id of skillIds) if (!catalogIds.includes(id)) errors.push(`skills/${id} is not in the catalogue`);

// --- generated consumers current ---
const mcpCatalog = read(join(REPO, "mcp-service", "src", "catalog.json"));
if (mcpCatalog !== read(join(PLUGIN, "catalog", "powers.json"))) errors.push("mcp-service/src/catalog.json differs from catalog/powers.json (run scripts/build-catalog.mjs)");
const mcpReleases = read(join(REPO, "mcp-service", "src", "releases.json"));
if (mcpReleases !== read(join(PLUGIN, "catalog", "release.json"))) errors.push("mcp-service/src/releases.json differs from catalog/release.json (run scripts/build-catalog.mjs)");
const siteData = join(REPO, "site-data", "powers.json");
if (!existsSync(siteData) || read(siteData) !== read(join(PLUGIN, "catalog", "powers.json"))) errors.push("site-data/powers.json missing or stale (run scripts/build-catalog.mjs)");

// --- hooks and mcp config ---
const hooks = json(join(PLUGIN, "hooks", "hooks.json"));
for (const event of ["SessionStart", "UserPromptSubmit", "PreToolUse"]) {
  if (!hooks.hooks[event]) errors.push(`hooks.json missing ${event}`);
}
const hookCmds = JSON.stringify(hooks);
if (!/session-start|discover|guard-mcp-write/.test(hookCmds)) errors.push("hooks.json does not reference the runner subcommands");
if (!existsSync(join(PLUGIN, "hook-runner", "index.mjs"))) errors.push("hook-runner/index.mjs missing");
const mcpConf = json(join(PLUGIN, ".mcp.json"));
const mcpUrl = mcpConf.mcpServers?.operator_powers?.url ?? "";
if (!mcpUrl.startsWith("https://")) errors.push(".mcp.json url must be https");
if (mcpUrl.includes("PENDING")) warns.push("RELEASE BLOCKER: .mcp.json still has the placeholder URL; deploy the MCP service and set the real workers.dev URL before tagging a release");

// --- required docs ---
for (const doc of ["PRIVACY.md", "TERMS.md", "SECURITY.md", "TROUBLESHOOTING.md", "INSTALL-CODEX.md", "INSTALL-CLAUDE.md", "HOW-UPDATES-WORK.md", "CONTRIBUTING.md", "SKILL-PUBLISHING-STANDARD.md", "MCP-SPEC.md"]) {
  if (!existsSync(join(PLUGIN, "docs", doc))) errors.push(`docs/${doc} missing`);
}
for (const f of ["README.md", "CHANGELOG.md", "LICENSE"]) {
  if (!existsSync(join(PLUGIN, f))) errors.push(`${f} missing`);
}
for (const doc of ["ROUTING-CONTRACTS.md", "SOURCE-LEDGER.md"]) {
  if (!existsSync(join(PLUGIN, "docs", doc))) errors.push(`docs/${doc} missing`);
}
const openaiTests = json(join(REPO, "submission", "openai", "test-cases.json"));
if (openaiTests.positive?.length !== 5 || openaiTests.negative?.length !== 3) errors.push("OpenAI submission requires exactly 5 positive and 3 negative test cases");

// --- forbidden content scan (privacy gate) ---
const FORBIDDEN = [
  /sk-[a-zA-Z0-9]{20,}/, // API keys
  /ghp_[a-zA-Z0-9]{20,}/,
  /\/Users\/nahid\//, // personal paths
  /nahid@|inspiredbyaiart@/i, // personal emails
  /threadify|revenue os|wow-audit|pipeline\.csv/i, // internal systems
];
function scanDir(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) { if (entry !== "node_modules" && entry !== ".git") scanDir(p); continue; }
    if (entry === "validate-package.mjs") continue; // the pattern definitions themselves
    if (!/\.(md|json|mjs|ts|txt|py)$/.test(entry)) continue;
    const text = read(p);
    for (const re of FORBIDDEN) {
      if (re.test(text)) errors.push(`forbidden content ${re} in ${p.replace(REPO + "/", "")}`);
    }
  }
}
scanDir(PLUGIN);

for (const w of warns) console.warn("warn:", w);
if (errors.length) {
  for (const e of errors) console.error("ERROR:", e);
  process.exit(1);
}
console.log(`validate-package: OK (${skillIds.length} skills, version ${release.version}, ${warns.length} warnings)`);
