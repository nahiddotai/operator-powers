# Skill Publishing Standard

Every public power must have:

1. A stable kebab-case id matching its folder; frontmatter `name` identical to it.
2. A description that states exactly when to use it AND when not to, under 1024 characters (hosts silently drop longer ones).
3. Required and optional inputs, and the output the user receives.
4. A process that works without the author present, in a clean environment.
5. A capability contract: reads, writes, network, external actions, per supported surface, with honest degrade modes.
6. Boundaries and failure behaviour: missing inputs are labelled, never fabricated.
7. Test prompts: at least five that should trigger it, five nearby that should not.
8. A catalogue entry in `catalog/powers.json` with triggers, negativeTriggers, permissions, and privacy line.
9. The publicisation gate: no personal paths, accounts, credentials, client data, private voice, or unlicensed third-party material. Attribution alone does not replace permission.
10. One clean-session run completing the real job before release.
