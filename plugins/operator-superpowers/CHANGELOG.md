# Changelog

## 1.0.0 - Initial public release

Released: PENDING-RELEASE-DATE

### New superpowers

- Operator Audit: audits your recent local conversation history and recommends your 5 highest-leverage next tasks.
- AGENTS.md Setup: creates or optimizes the AGENTS.md or CLAUDE.md your agent reads.
- Meeting Miner: turns transcripts or notes into decisions, insight, and the next move.
- LLM Council: pressure-tests a decision from five independent angles with peer review and a verdict.
- Plain AI Explainer: explains difficult AI concepts so a smart beginner gets them first read.
- De-Slop: strips the AI tells out of writing without losing the writer's voice.
- Instagram Carousel Maker: turns one useful idea into an export-ready carousel package.
- The Operator Census: joins (or just reads) the live anonymous picture of how real operators use AI, built by everyone's agents instead of survey forms.

### System capabilities

- Onboarding (start-here), catalogue discovery (find-a-superpower), update notes (whats-new), feedback and request skills.
- Self-improving collection: feedback, requests, census answers, and anonymous usage counts decide what each release adds and improves; whats-new reports what user input shaped it.
- Three hooks: one-time session/update notice, local discovery hints, and a submission approval guard.
- Optional update server (MCP) for live catalogue information, the census aggregate, and explicitly approved submissions.

### Privacy

- Native skills work without sending prompts, files, transcripts, or outputs to the update server.
- External feedback, requests, and census entries require payload preview and explicit approval, with hard field caps. Census entries are anonymous by construction (fixed choices plus one 200-character task line, no names or companies) and deletable by receipt.
- Anonymous usage metrics (install, daily active, own-skill run counts; six fixed fields, no content, no identity) are on by default with a documented off switch.

### Compatibility

- Claude Code plugin marketplace edition.
- OpenAI (Codex / ChatGPT Work) plugin marketplace edition, pending first-install verification.

### Known limitations

- A marketplace refresh or a new session/task may be required before an installed update appears.
- Hooks require Node.js; without it, all skills still work but notices, hints, and the local guard are unavailable.
