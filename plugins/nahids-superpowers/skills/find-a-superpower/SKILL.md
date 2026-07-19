---
name: find-a-superpower
description: Find the right Operator Superpowers skill for a job without memorising names. Use when the user asks what superpowers exist, which skill fits a task, what this plugin can do, wants to browse the catalogue, or describes a job and wants to know if there is a superpower for it.
---

# Find a Superpower

## The Job

Match what the user is trying to do to the right superpower, or tell them honestly that none fits.

## How to Run It

1. Read the local catalogue at `${CLAUDE_PLUGIN_ROOT}/catalog/superpowers.json` (fall back to `catalog/superpowers.json` two directories above this skill file). The local catalogue is the source of truth for what is actually installed.
2. Match the user's request against each entry's `oneLineJob`, `triggers`, and `description`. Respect `negativeTriggers`: if the request matches one, that skill is not a candidate.
3. Return at most three ranked recommendations. For each: the job it completes, the name, and one sentence on why it matches this request. Lead with the job, not the identifier.
4. If exactly one clearly fits, offer to start it now with the context the user already gave.
5. If nothing fits, say so plainly and mention `request-a-superpower`. Never stretch a skill to a job it does not do.

## Live Enrichment (Optional)

If the `operator_superpowers` MCP server is connected and the user wants current information (newest additions, current examples, release notes), you may call its read tools (`search_superpowers`, `get_superpower`). Rules:

- The local catalogue decides what is installed. Never claim a skill from the live catalogue is available locally unless the local catalogue contains it; if it is newer than the installed version, say it arrives with a plugin update.
- If the service is unreachable, continue with the local catalogue and say live information was unavailable. Never block on it.

## Boundaries

- Browsing sends nothing anywhere; the MCP read tools receive only the search query, and only when the user wants live information.
- Never list internal file paths or metadata at the user; jobs and names only, unless they ask for detail.
