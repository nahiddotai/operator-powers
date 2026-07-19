# Troubleshooting

**Skills don't trigger naturally.** Invoke directly (Claude Code: `/nahids-superpowers:start-here`; OpenAI surfaces: select via `@`). If direct invocation works, discovery is just conservative; describe the job more specifically.

**No welcome message appeared.** The session hook needs Node.js (`node --version`). No Node means no hooks, but every skill still works. Corrupt state also self-heals: delete `~/.nahids-superpowers/state.json` if you want a clean slate.

**Update doesn't show up.** Refresh the marketplace, update the plugin, start a NEW session/task. Codex caches installed plugins; reinstalling is sometimes needed. Compare your version against `whats-new`.

**Live catalogue or feedback says service unavailable.** The companion service is optional; skills and local search keep working. Your prepared feedback text is shown so you can copy it and retry later, or post it as a GitHub issue.

**"This submission is missing its confirmation data."** The guard hook blocked a submission that skipped the show-and-approve step. Run `give-feedback` or `request-a-superpower` and approve the shown payload.

**Turning off usage metrics.** Ask your assistant to disable Nahid's Superpowers telemetry, or set telemetry to false in `~/.nahids-superpowers/state.json`, or set the NAHIDS_SUPERPOWERS_NO_TELEMETRY environment variable. Everything else keeps working identically.

**Which failure is which:** install/marketplace errors come from your client; hook errors mention the hook runner; MCP errors mention the companion service; a skill answering oddly is a skill issue. Say which one you're seeing when reporting via GitHub issues.
