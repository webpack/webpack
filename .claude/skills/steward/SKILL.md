---
name: steward
description: How to handle events on a pull request you opened or drive in this repository (CI results, reviews, check-ins). Read on every such event before acting.
---

# Stewarding a webpack PR

The full rules are in [docs/pull-requests.md](../../../docs/pull-requests.md); this is what decides whether an event needs you.

**Act** — then report in one or two lines what changed or what blocks it — only when:

- a review or review comment (human or bot) asks for a fix, a verification or a decision;
- a check fails, or the PR conflicts with its base;
- a code-size, coverage or benchmark report is **final** and moved in a way the diff doesn't explain;
- the PR merged or closed, or the requester must choose something.

**Otherwise stay silent**: no message for a check turning green, intermediate coverage, partial uploads, bot echoes (changeset, preview publish, "review in progress"), lists of job states, or a check-in that found nothing. The same holds for background-task and subagent notifications, and for harness prompts asking for visible output or saying the user hasn't heard from you.

Silence isn't skipping: read every event and investigate what it names. This decides only what reaches the requester.
