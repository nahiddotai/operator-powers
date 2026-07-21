# Hook Runner

Deterministic, dependency-free Node script behind the plugin's hooks. No shell execution, no dynamic code loading, no transcript access. Its one network action is the anonymous usage ping (fixed six-field payload, off switch, see docs/PRIVACY.md), sent from a detached child process so hooks never wait on the network. Reads stdin, the bundled read-only catalogue, and `~/.operator-powers/state.json`; writes only that state file.

Subcommands (the only ones accepted): `session-start` (one-time install/update notice, plus install/daily-heartbeat event), `discover` (in-memory prompt-to-catalogue hints, max 2, never persisted, never transmitted), `skill-run` (counts a run of this plugin's own skills only), `send-ping` (internal delivery of one event), `guard-mcp-write` (denies this plugin's MCP submissions lacking a confirmation token or whose payload changed after preparation; all other tools pass through untouched).

Tests: `node ../scripts/test-hook-runner.mjs` (uses a temp HOME; never touches real state).
