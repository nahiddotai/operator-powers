---
name: repeated-task-to-skill
description: Decide whether a repeated task is worth turning into a reusable AI skill, and if it is, produce an implementation-ready skill brief with trigger description, inputs, process steps, output contract, and test prompts. Use when the user says they keep doing the same task with AI, keep re-pasting the same prompt, want to turn a workflow into a skill, ask whether something should be a skill, or want help designing a skill for Claude Code, Codex, or another agent.
---

# Repeated Task to Skill

## The Job

The user keeps doing some task with AI: same prompt re-pasted, same corrections re-typed, same steps re-explained. This skill decides whether that task deserves to become a reusable skill, and when it does, produces a complete brief that the user (or their agent) can build the skill from directly.

## Step 1: Capture the Task

Get the real task, not the abstract version. Ask for whichever of these exists:

- the prompt they keep re-pasting
- a recent chat where they did the task
- the corrections they always end up making
- an example of a good final output

The corrections matter most. Everything the user repeatedly fixes is exactly what the skill must encode.

## Step 2: The Worth-It Test

A task deserves to be a skill when at least three of these are true:

1. **Repeats:** done more than three times, or on a schedule
2. **Stable shape:** the steps are roughly the same each time
3. **Correction cost:** the AI gets it wrong the same way each time without guidance
4. **Quality bar:** the output has a definite standard, not just "whatever's fine"
5. **Handoff value:** someone or something else (another session, another person, a scheduled run) could do it with good instructions

A task does NOT deserve to be a skill when:

- it has run fewer than three times (write a note, not a skill; make the skill after the third run)
- every instance is genuinely different (that is judgment, not process)
- it's a one-line prompt with no corrections (just save the prompt)
- the hard part is a credential, account, or approval the skill cannot carry

Give a clear verdict: **build it**, **not yet, here's the note to keep instead**, or **never, and here's why**. Do not flatter every task into a skill.

## Step 3: The Skill Brief

When the verdict is build it, produce this brief in full:

```markdown
# Skill Brief: [kebab-case-name]

## Trigger description
[2-4 sentences written as the skill's actual description: exactly when it should
activate, the phrases a user would naturally say, and when it should NOT activate.
This is the most important section; a skill nobody triggers does not exist.]

## Required inputs
[what the user must provide each run]

## Optional inputs
[what improves the result when present]

## Process
[numbered steps the agent follows, specific enough that a fresh session with no
memory of this conversation produces the same quality. Encode every recurring
correction from Step 1 as an explicit rule.]

## Output contract
[the exact shape of the deliverable: format, sections, length, tone rules,
where it gets saved if anywhere]

## Boundaries
[what the skill must never do; what needs user approval; how it behaves when
inputs are missing]

## Test prompts
[3 prompts that should trigger it, 3 nearby prompts that should not,
and 1 realistic full run with expected output shape]
```

## Step 4: Package for Their Tool

Ask which agent will run it, then deliver accordingly:

- **Claude Code / Codex and compatible tools:** convert the brief into a ready `SKILL.md` file with YAML frontmatter (`name` and `description` keys; the description holds the full trigger text and must stay under 1024 characters, since some hosts silently drop skills with longer descriptions). Save it as `<skill-name>/SKILL.md` in the tool's skills folder, confirming the folder location with the user rather than assuming it.
- **Settings-based tools (ChatGPT custom instructions, project instructions):** deliver the brief as a paste-ready instruction block and say plainly that those surfaces have no trigger mechanism, so the user starts the task by naming it.

## Step 5: Test Before Trusting

Have the user run one of the test prompts in a fresh session and compare the result against the output contract. A skill that has never run in a clean session is a draft, not a skill. If the run misses, the fix is almost always in the trigger description or an under-specified process step; sharpen and rerun.

## Capability Contract

- Reads: the examples, prompts, and chats the user provides.
- Writes: the brief, and the SKILL.md file when the host supports file writes and the user confirms the location. Chat-only surfaces get everything as paste blocks.
- Network: none.
- External actions: none.

## Boundaries

- Never write a skill that embeds credentials, private client data, or another person's copyrighted method; flag these and design around them (the skill asks for the input at runtime instead of containing it).
- Never overwrite an existing skill file without showing the user the current version first.
- If the user's task is really a scheduling or automation problem ("do this every Monday"), say that a skill defines HOW and their tool's automation features define WHEN, and hand over the skill plus that pointer rather than pretending the skill self-schedules.

## Completion Checklist

- A clear build / not yet / never verdict was given with reasons
- Recurring corrections from real usage are encoded as explicit process rules
- The trigger description says when NOT to activate
- The description is under 1024 characters
- The skill file is saved (or delivered as a paste block) and one clean-session test ran
