# Releasing

The one rule that matters: **clients cache plugins by version number.** If the content changes but the version does not, nobody gets the change. Every release ships a new version, no exceptions, even for a one-word fix.

## The runbook

1. **Bump the version.** Edit `plugins/operator-powers/catalog/release.json`: set `version`, add a new entry at the top of `releases` with its `date` and a `new` / `improved` / `fixed` breakdown written as jobs ("you can now turn a meeting into a deliverable"), not internals. Match it in `plugins/operator-powers/.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, and `CHANGELOG.md`.

   Semver in practice here: new power or changed permissions is a minor bump; wording, triggers, and fixes are a patch bump.

2. **Credit the users who caused it.** If a release exists because of feedback or requests, say so in the release entry. `whats-new` leads with that line, and it is the self-improving claim proving itself.

3. **Regenerate and validate.**

   ```
   cd plugins/operator-powers
   node scripts/build-catalog.mjs
   node scripts/verify-version-sync.mjs
   node scripts/test-hook-runner.mjs
   node scripts/validate-package.mjs
   ```

   All four must pass with zero warnings. `build-catalog` is the only thing allowed to write `mcp-service/src/*.json` and `site-data/`; never hand-edit those.

4. **Deploy the update server** so the live catalogue matches what the marketplace serves:

   ```
   cd mcp-service && npx wrangler deploy
   ```

   A release where the server and the package disagree makes `whats-new` lie.

5. **Commit, tag, push.**

   ```
   git commit -am "Release X.Y.Z: <headline>"
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   gh release create vX.Y.Z --title "Operator Powers X.Y.Z" --notes "..."
   ```

6. **Verify as a stranger.** Install fresh in a client you did not develop in, from the GitHub marketplace (not a local directory), and confirm the new power runs and `whats-new` reports the new version.

## Dogfooding warning

Installing from a local directory (`/plugin marketplace add /path/to/repo`) is fine for development, but that marketplace never pulls from GitHub. Keep your day-to-day install pointed at `nahiddotai/operator-powers` so you experience exactly what users experience, including the update path.

## What users see

An update reaches someone only after they refresh the marketplace, update the plugin, and start a new session. Nothing changes under them mid-session, by design. The session hook announces the new version once, and `whats-new` explains what arrived.
