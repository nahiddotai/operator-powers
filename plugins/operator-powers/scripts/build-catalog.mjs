#!/usr/bin/env node
// Regenerates every consumer of the canonical catalogue. Sources of truth:
// catalog/powers.json and catalog/release.json. Never hand-edit the outputs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(PLUGIN, "..", "..");
const catalog = readFileSync(join(PLUGIN, "catalog", "powers.json"), "utf8");
const release = readFileSync(join(PLUGIN, "catalog", "release.json"), "utf8");

writeFileSync(join(REPO, "mcp-service", "src", "catalog.json"), catalog);
writeFileSync(join(REPO, "mcp-service", "src", "releases.json"), release);
mkdirSync(join(REPO, "site-data"), { recursive: true });
writeFileSync(join(REPO, "site-data", "powers.json"), catalog);
console.log("build-catalog: regenerated mcp-service/src/{catalog,releases}.json and site-data/powers.json");
