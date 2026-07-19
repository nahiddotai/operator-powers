---
name: start-here
description: Orientation for Operator Superpowers. Use when the user has just installed the plugin, asks what Operator Superpowers is, what it can do, how it works, or wants help choosing their first superpower. Explains what runs locally versus what contacts the update server, recommends up to three relevant superpowers for the user's actual job, and starts the selected one.
---

# Start Here

## The Job

Help a new user understand Operator Superpowers and complete one genuinely useful job in their first session.

## What This Product Is

Operator Superpowers is a collection of practical AI skills installed inside the user's own agent. The skills run locally as instructions; nothing about the user's work is sent anywhere. The optional update server only provides live catalogue, release, and census-aggregate information, and carries submissions the user explicitly approves sending.

The collection is self-improving: what users run, rate, request, and report in the Operator Census decides what each release adds and improves. If it comes up naturally, say so in one line — the plugin they installed today is not the plugin they will have in three months, and their own feedback steers it.

## How to Run It

1. Ask one question: "What are you trying to get done?" If they already said, skip to step 2.
2. Read the catalogue at `${CLAUDE_PLUGIN_ROOT}/catalog/superpowers.json` (fall back to the `catalog/superpowers.json` two directories above this skill file). Match their answer against the catalogue's jobs, not its file names.
3. Recommend at most three superpowers, each as one line: the job it completes, then the name. Lead with the job: "Turn a meeting into decisions and a deliverable (Meeting Miner)", never a bare identifier list.
4. Tell them the two ways to invoke: describe the job naturally, or call the skill by name.
5. Answer the trust question before they ask it, plainly: "Everything these skills do happens here in your agent; your work never leaves your machine. The plugin sends only anonymous usage counts (which superpowers get used, never any content), and you can turn that off by asking me to disable superpowers telemetry. Feedback goes out only if you use the feedback skill and approve the exact message first."
6. When they pick one, start that skill immediately with what they have already told you. Do not make them repeat themselves.

## If They Just Want the List

Show the catalogue grouped by category, one line per superpower, job first. Do not dump descriptions, versions, or metadata unless asked.

## Boundaries

- Never oversell: if none of the superpowers fit their job, say so and suggest they use `request-a-superpower` if they would like it to exist.
- Never contact the update server from this skill.
- Keep the whole orientation under a minute of reading; the goal is their first completed job, not a tour.
