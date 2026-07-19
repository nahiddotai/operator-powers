# Operator Superpowers

Practical AI skills for non-technical knowledge work. One plugin, installed into the AI you already use.

**Install once. Use practical AI skills where you already work. The collection is self-improving: what users run, rate, request, and report in the census decides what each update adds, and updates arrive through normal plugin updates.**

## What's inside

| Superpower | The job it completes |
|---|---|
| Operator Audit | Audit your last two weeks and get your 5 highest-leverage next tasks |
| AGENTS.md Setup | Create or optimize the AGENTS.md or CLAUDE.md your AI reads |
| Meeting Miner | Turn a meeting into decisions, insight, and the next move |
| LLM Council | Pressure-test a decision from five independent angles |
| Plain AI Explainer | Explain a difficult AI concept so a smart beginner gets it |
| De-Slop | Strip the AI tells out of writing without losing your voice |
| Instagram Carousel Maker | Turn one useful idea into an export-ready carousel |
| The Operator Census | Join (or just read) the live anonymous picture of how real operators use AI |

Plus five small system skills: `start-here`, `find-a-superpower`, `whats-new`, `give-feedback`, `request-a-superpower`.

## How it improves itself

Every release is shaped by four signals users choose to send: feedback ratings, superpower requests, census answers, and anonymous usage counts. Nothing is scraped and nothing leaves your machine without being shown to you first; the loop runs on what people deliberately contribute, and `whats-new` reports what user input shaped each release.

## Install

- **Claude Code:** [docs/INSTALL-CLAUDE.md](docs/INSTALL-CLAUDE.md)
- **Codex / ChatGPT Work:** [docs/INSTALL-CODEX.md](docs/INSTALL-CODEX.md)

## Privacy in one paragraph

Skills run inside your own AI tool; your prompts, files, and outputs are never collected. The plugin sends only anonymous usage counts (install, daily active, which of its own superpowers ran): six fixed fields, no content, no identity, on by default and easy to turn off. The hooks' full source is in [hook-runner/](hook-runner/). The optional update server only provides live catalogue, release, and census-aggregate information, and carries submissions (feedback, requests, census entries) you explicitly approved after seeing the exact message. Census entries are anonymous by construction: fixed choices plus one short task line, deletable by receipt. Full detail: [docs/PRIVACY.md](docs/PRIVACY.md).

## Support

Issues and requests: GitHub issues, or run `give-feedback` / `request-a-superpower` inside the plugin. Troubleshooting: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).
