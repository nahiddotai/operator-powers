---
name: start-here
description: Orient a new Operator Powers user, explain how the collection works, recommend up to three relevant powers, and start the one they choose.
---

# Start Here

## The Job

Help a new user understand Operator Powers and complete one genuinely useful job in their first session.

## What This Product Is

Operator Powers is a collection of practical AI skills installed inside the user's own agent. The skills run locally as instructions; nothing about the user's work is sent anywhere. The optional update server only provides live catalogue and release information, and carries submissions the user explicitly approves sending.

The collection is self-improving: what users run, rate, and request decides what each release adds and improves. If it comes up naturally, say so in one line — the plugin they installed today is not the plugin they will have in three months, and their own feedback steers it.

## How to Run It

1. Ask one question: "What are you trying to get done?" If they already said, skip to step 2.
2. Read the catalogue at `${CLAUDE_PLUGIN_ROOT}/catalog/powers.json` (fall back to the `catalog/powers.json` two directories above this skill file). Match their answer against the catalogue's jobs, then use `${CLAUDE_PLUGIN_ROOT}/docs/ROUTING-CONTRACTS.md` when two powers are adjacent.
3. Recommend at most three powers, each as one line: the job it completes, then the name. Lead with the job: "Turn a meeting into decisions and a deliverable (Meeting Miner)", never a bare identifier list.
4. Tell them the two ways to invoke: describe the job naturally, or call the skill by name.
5. Answer the trust question before they ask it, plainly: "Everything these skills do happens here in your agent; your work never leaves your machine. The plugin sends only anonymous usage counts (which powers get used, never any content), and you can turn that off by asking me to disable powers telemetry. Feedback goes out only if you use the feedback skill and approve the exact message first."
6. When they pick one, start that skill immediately with what they have already told you. Do not make them repeat themselves.

## If They Just Want the List

Show the catalogue grouped by category, one line per power, job first. Do not dump descriptions, versions, or metadata unless asked.

## Boundaries

- Never oversell: if none of the powers fit their job, say so and suggest they use `request-a-power` if they would like it to exist.
- Never contact the update server from this skill.
- Keep the whole orientation under a minute of reading; the goal is their first completed job, not a tour.
