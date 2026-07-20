---
name: voice-dna
description: Extract the user's writing voice from real samples and generate their own portable writing-voice skill. Use when the user wants AI to write like them, complains that AI drafts don't sound like them, wants to capture or clone their writing style, or asks to build a voice profile or personal writing skill. Needs 3 to 5 genuine writing samples; delivers a complete SKILL.md file the user owns and can install in any AI tool.
---

# Voice DNA

## The Job

Turn 3 to 5 samples of the user's real writing into a portable writing-voice skill they own: a file that makes any AI they use sound like them, not like a model.

## Why the Deliverable Is a Skill File

A style summary gets pasted once and lost. A skill file is infrastructure: installed once, it shapes every future draft in every tool that reads skills (Claude, Codex, Cursor, and the rest). The user leaves with an asset, not advice.

## How to Run It

1. Collect 3 to 5 samples of their genuine writing. Good samples: emails they actually sent, posts, messages to colleagues, anything written without AI. Reject and re-ask politely if samples are: AI-assisted (ask directly), under 50 words each, or all from one context (three formal emails teach formality, not voice). Aim for at least two different contexts.

2. Analyze across these dimensions, quoting evidence from the samples for each finding:
   - **Register**: how they sound in one sentence, stated as a comparison ("a sharp friend explaining over coffee", not "conversational").
   - **Rhythm**: sentence length distribution, where they break paragraphs, whether they front-load the point or build to it.
   - **Vocabulary fingerprint**: 5 to 8 words or constructions they reach for; 3 to 5 they never use.
   - **Signature moves**: 3 specific repeatable patterns visible in at least two samples ("opens with the objection a reader is already thinking", not "engaging openings").
   - **Never rules**: 3 to 5 things that would instantly break the voice, including punctuation habits (some people never use semicolons; some never write one-sentence paragraphs).
   - **Formatting habits**: lists vs prose, line breaks, capitalization quirks, emoji policy.

3. Show the analysis and let them correct it. They know their voice; the samples are evidence, not verdict. Fold in their corrections.

4. Generate the deliverable: a complete, valid skill file named after them (for example `jamie-writing-voice`), with:
   - YAML frontmatter: lowercase-hyphen `name` (64 chars max), `description` under 1024 characters that says when to apply the voice.
   - Body sections: Voice summary, Rhythm rules, Vocabulary (use / never), Signature moves, Never rules, and one short before/after example pair drawn from their own samples (generic AI phrasing vs their phrasing).

5. Prove it works: write one short paragraph on a topic they pick, once in default AI voice and once through their new skill, side by side. Let them feel the difference. If it misses, adjust the skill file and show the diff.

6. Tell them how to install it: save the file as `SKILL.md` inside a folder named after the skill, in their AI tool's skills directory (`~/.claude/skills/<name>/` for Claude, `~/.codex/skills/<name>/` for Codex), or add it via their tool's skills settings. The file is theirs: portable, editable, no dependence on this plugin.

## Boundaries

- The analysis and the generated file stay in the conversation and on the user's machine; nothing is sent anywhere.
- Never invent patterns the samples don't show. Thin evidence gets flagged as thin ("only one sample shows this; confirm it's really you").
- Never claim the skill file captures everything; voice drifts, and the file is editable. Suggest re-running after a few months of real use.
- One voice per run. Different contexts that need genuinely different voices (client emails vs personal posts) are two runs and two files.

Inspired by the emerging voice-analysis skill pattern in the Claude skills ecosystem; rebuilt for non-technical writers with a portable skill file as the deliverable.
