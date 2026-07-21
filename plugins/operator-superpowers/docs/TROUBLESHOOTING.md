# Troubleshooting

**Skills don't trigger naturally.** Invoke directly (Claude Code: `/operator-superpowers:start-here`; OpenAI surfaces: select via `@`). If direct invocation works, discovery is just conservative; describe the job more specifically.

**No welcome message appeared.** The session hook needs Node.js (`node --version`). No Node means no hooks, but every skill still works. Corrupt state also self-heals: delete `~/.operator-superpowers/state.json` if you want a clean slate.

**Update doesn't show up.** Refresh the marketplace, update the plugin, start a NEW session/task. Nothing syncs live: your client copies the plugin's files into its own cache when you install, and reads that copy until you explicitly update. Codex caches installed plugins too; reinstalling is sometimes needed. Compare your version against `whats-new`.

**Updated, but the new superpowers still aren't there.** Your client caches each plugin under its version number, so a cached copy can be stale while the marketplace has moved on. In Claude Code, check what you actually have installed:

```
/plugin
```

If the version matches the latest release but skills are missing, remove and reinstall the plugin, then start a new session. Also confirm the marketplace you installed from is the GitHub one (`nahiddotai/operator-superpowers`) and not a local folder copy from earlier testing: a local-directory marketplace never pulls new releases from GitHub.

**Skills are old but the update server knows about new ones.** These are two separate things. The MCP connector (live catalogue, `whats-new`, feedback) always talks to the current server, while your skills are the cached files on your machine. Seeing a new superpower in search that you can't run means the catalogue is ahead of your install: update the plugin and start a new session.

**Live catalogue or feedback says service unavailable.** The update server is optional; skills and local search keep working. Your prepared feedback text is shown so you can copy it and retry later, or post it as a GitHub issue.

**"This submission is missing its confirmation data."** The guard hook blocked a submission that skipped the show-and-approve step. Run `give-feedback` or `request-a-superpower` and approve the shown payload.

**Turning off usage metrics.** Ask your assistant to disable Operator Superpowers telemetry, or set telemetry to false in `~/.operator-superpowers/state.json`, or set the OPERATOR_SUPERPOWERS_NO_TELEMETRY environment variable. Everything else keeps working identically.

**Which failure is which:** install/marketplace errors come from your client; hook errors mention the hook runner; MCP errors mention the update server; a skill answering oddly is a skill issue. Say which one you're seeing when reporting via GitHub issues.
