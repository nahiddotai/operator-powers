# Privacy

Plain-language summary: the skills run inside your own AI tool. Your prompts, files, transcripts, and outputs stay there. The only thing that ever leaves is a feedback or request message you explicitly wrote and approved after seeing it in full.

## What runs locally

- All twelve skills are instruction files executed by your own agent. They send nothing to us.
- The discovery hint hook reads your prompt in memory, checks it against the bundled catalogue, and discards it. Your prompt is never written to disk or sent anywhere.
- The session hook reads only the plugin's own release file and one small local state file.

## Anonymous usage metrics (and the off switch)

So the maker can see whether the plugin is being used and which superpowers earn their place, the plugin sends small anonymous usage events: one when it is first installed, at most one still-in-use ping per day, and one when a superpower from this plugin runs. Each event contains exactly six fields: a random install id (generated on your machine, linked to no identity), the event name, the superpower id (only this plugin's own skills, never any other tool), which client (Claude Code or Codex), your operating system name, and the plugin version. The payload shape is fixed in the open-source hook runner and the server rejects anything else, so your prompts, files, outputs, transcripts, and paths are structurally excluded, not just promised away.

Metrics are on by default. To turn them off: ask your assistant to disable Operator Superpowers telemetry (it sets telemetry to false in the state file below), edit that file yourself, or set the OPERATOR_SUPERPOWERS_NO_TELEMETRY environment variable. Everything works identically with metrics off.

## The one local file we keep

`~/.operator-superpowers/state.json` stores: the last plugin version you saw (so update notices appear once), whether first run completed, your hook and telemetry preferences, and the random anonymous install id. Prompts and outputs are prohibited from this file. Deleting it is always safe; the effects are seeing the welcome notice again and starting a fresh anonymous id.

## What the update server receives

Only explicit tool arguments, in exactly these cases:

- Live catalogue search: your search query.
- What's new: your installed version number.
- Feedback or requests: only the fields shown to you for approval, hard-capped at 1,000 characters of note text. The exact payload is displayed before anything is sent, and the server rejects any payload that changed after preview.

The service also receives the anonymous usage events described above. It stores no IP addresses at application level and requires no account or email; the country shown in aggregate metrics comes from Cloudflare's network edge, not from storing your address. Rate limiting uses a fingerprint that rotates daily and cannot be reversed into an address.

## Honest limitation

The approval flow is designed so the exact payload is shown to you before submission, and the server rejects payloads that changed after preparation. The server cannot itself verify that a human clicked approve; your AI tool's own tool-approval prompt is the enforcement layer. We recommend leaving host approval prompts ON for this server's write tools.

## Retention and deletion

- Feedback and requests: kept up to 12 months, deleted sooner on request.
- Every submission returns a receipt id and a one-time deletion token; `delete_my_submission` removes the record immediately.
- Read-tool queries are not retained in application analytics.
- Aggregate counts (non-identifying) may be kept after records are deleted.

## What we never collect

Prompt text, output text, transcripts, file names, project paths, hidden model context, advertising identifiers, identity of any kind, or per-user behavioural profiles. Usage metrics are counts, disclosed above, and switchable off.
