# Install in Claude Code

1. Add the marketplace:
   `/plugin marketplace add nahiddotai/nahids-superpowers`
2. Install:
   `/plugin install nahids-superpowers@nahiddotai`
3. Review what the installer shows you: the plugin ships skills, three hooks (session notice, discovery hints, submission guard), and one companion MCP server. All hook source is in `hook-runner/` in this repository.
4. Start a new session. You'll see a one-time welcome line. Say the job you want done, or run `/nahids-superpowers:start-here`.

Requirements: the hooks need Node.js on your machine. Without Node, every skill still works; you just lose the welcome notice, hints, and the local submission guard.

Updating: `/plugin marketplace update nahiddotai` then update the plugin when a new version shows. Changes apply in a new session. Run `whats-new` after updating.

Disabling hooks: manage or disable this plugin's hooks anytime via `/hooks` or by disabling the plugin; skills keep working with hooks off.
