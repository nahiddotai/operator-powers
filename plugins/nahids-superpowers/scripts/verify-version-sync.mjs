#!/usr/bin/env node
// Release gate: every declared surface must carry the same version, and the
// release tag (when provided as argv[2], e.g. v1.0.0) must match it.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(PLUGIN, "..", "..");
const j = (p) => JSON.parse(readFileSync(p, "utf8"));

const surfaces = {
  "claude plugin.json": j(join(PLUGIN, ".claude-plugin", "plugin.json")).version,
  "codex plugin.json": j(join(PLUGIN, ".codex-plugin", "plugin.json")).version,
  "claude marketplace": j(join(REPO, ".claude-plugin", "marketplace.json")).plugins[0].version,
  "release.json": j(join(PLUGIN, "catalog", "release.json")).version,
  "mcp bundle releases.json": j(join(REPO, "mcp-service", "src", "releases.json")).version,
};
const tag = process.argv[2];
if (tag) surfaces["git tag"] = tag.replace(/^v/, "");
const set = new Set(Object.values(surfaces));
if (set.size !== 1) {
  console.error("VERSION DRIFT:", JSON.stringify(surfaces, null, 2));
  process.exit(1);
}
console.log(`verify-version-sync: all surfaces at ${[...set][0]}`);
