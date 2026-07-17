# Privacy

Plain-language summary: the skills run inside your own AI tool. Your prompts, files, transcripts, and outputs stay there. The only thing that ever leaves is a feedback or request message you explicitly wrote and approved after seeing it in full.

## What runs locally

- All twelve skills are instruction files executed by your own agent. They send nothing to us.
- The discovery hint hook reads your prompt in memory, checks it against the bundled catalogue, and discards it. It cannot write it to disk or send it anywhere; the hook runner contains no network code.
- The session hook reads only the plugin's own release file and one small local state file.

## The one local file we keep

`~/.nahids-superpowers/state.json` stores: the last plugin version you saw (so update notices appear once), whether first run completed, and your hook preferences. Prompts and outputs are prohibited from this file. Deleting it is always safe; the only effect is seeing the welcome notice again.

## What the companion service receives

Only explicit tool arguments, in exactly these cases:

- Live catalogue search: your search query.
- What's new: your installed version number.
- Feedback or requests: only the fields shown to you for approval, hard-capped at 1,000 characters of note text. The exact payload is displayed before anything is sent, and the server rejects any payload that changed after preview.

The service stores no IP addresses at application level and requires no account or email. Rate limiting uses a fingerprint that rotates daily and cannot be reversed into an address.

## Honest limitation

The approval flow is designed so the exact payload is shown to you before submission, and the server rejects payloads that changed after preparation. The server cannot itself verify that a human clicked approve; your AI tool's own tool-approval prompt is the enforcement layer. We recommend leaving host approval prompts ON for this server's write tools.

## Retention and deletion

- Feedback and requests: kept up to 12 months, deleted sooner on request.
- Every submission returns a receipt id and a one-time deletion token; `delete_my_submission` removes the record immediately.
- Read-tool queries are not retained in application analytics.
- Aggregate counts (non-identifying) may be kept after records are deleted.

## What we never collect

Prompt text, output text, transcripts, file names, project paths, hidden model context, silent usage tracking, advertising identifiers, or cross-session behavioural profiles.
