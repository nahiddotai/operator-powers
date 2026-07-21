# Contributing

Bug reports and power requests: GitHub issues, or the `give-feedback` / `request-a-power` skills from inside the plugin.

Pull requests are welcome for fixes and docs. New skills go through the publishing standard (SKILL-PUBLISHING-STANDARD.md) and the maintainer's publicisation gate; a PR adding a skill should include the SKILL.md, a catalogue entry, and test prompts. Generated files (mcp-service/src/*.json, site-data/) are never edited by hand; run `scripts/build-catalog.mjs`.

Before pushing: `node scripts/validate-package.mjs && node scripts/test-hook-runner.mjs`.
