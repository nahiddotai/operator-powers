# Hook Runner

Deterministic, dependency-free Node script behind the plugin's three hooks. No network client, no shell execution, no dynamic code loading, no transcript access. Reads stdin, the bundled read-only catalogue, and `~/.nahids-superpowers/state.json`; writes only that state file.

Subcommands (the only three accepted): `session-start` (one-time install/update notice), `discover` (in-memory prompt-to-catalogue hints, max 2, never persisted), `guard-mcp-write` (denies this plugin's MCP submissions lacking a confirmation token or whose payload changed after preparation; all other tools pass through untouched).

Tests: `node ../scripts/test-hook-runner.mjs` (uses a temp HOME; never touches real state).
