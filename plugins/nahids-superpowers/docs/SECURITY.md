# Security

## Report a vulnerability

Open a private security advisory on the GitHub repository (Security tab), or open an issue asking for a private contact route if the advisory feature is unavailable. Please do not disclose publicly before a fix ships.

## Design

- **No runtime code download.** The plugin executes only the files shipped in the installed release.
- **Dependency-free hook runner.** The runner uses only the Node standard library: no network client, no shell execution, no dynamic loading, no transcript access. Its full source is in `hook-runner/` and is covered by deterministic tests.
- **Write-guard hook.** `PreToolUse` blocks this plugin's MCP submission tools when the payload lacks a confirmation token or no longer matches the hash of what was prepared and shown. Scope note: on machines where hooks cannot run (no Node), this guard does not exist; protection is then the server-side token validation plus your host's tool-approval prompts. Keep those prompts on.
- **Server-side enforcement.** The companion service independently validates payload shape, field allowlist, size caps, token signature, and expiry. The client-side guard is a second line, not the only line.
- **Prompt injection is a named threat.** Skills that process third-party content (meeting transcripts, documents) treat that content as data, never instructions; nothing inside a processed document may trigger a feedback or request submission. Server-side field caps bound what any successful manipulation could exfiltrate.
- **Kill switch.** MCP write tools can be disabled independently of read tools.
- **Supply chain.** Public source, protected main branch, required CI, signed tags, no mutable releases, secret scanning, and a lockfile for the (dev-only) MCP service dependencies.

## Incident response

A compromised release is withdrawn from the marketplace entry, marked withdrawn in the changelog and MCP status, and followed by a patch release with recovery instructions. Hosting credentials are rotated and affected records deleted.
