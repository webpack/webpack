# Pull requests

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps its rules and a pointer here. -->

Every section below is **required** — follow it exactly.

## Adding a Changeset

Every user-facing change needs one:

```bash
# Create .changeset/<NNN>-<descriptive-name>.md with this format:
---
"webpack": patch    # or minor / major
---

Description of the change.
```

`patch` = bug fix, `minor` = feature, `major` = breaking. No `fix:`/`feat:` prefix.

**Description**: one imperative sentence, ≤ 80 characters, **capitalized**, **trailing period** ("Fix split-chunks cache key collision."). Changesets go into `CHANGELOG.md` verbatim; rationale belongs in the PR body.

**One changeset per PR** — fold related changes into one entry (one sentence, highest bump level; length may stretch slightly); separate files only for genuinely unrelated changes. **Union same-topic entries**: first scan `.changeset/` for a pending entry on the same area (option, parser, subsystem, bug family) and fold into it — seven "Speed up JavaScript parsing." lines are one entry.

**Filename sets order.** Entries render grouped by bump level (Major → Minor → Patch), then in sorted filename order. Name each `NNN-<description>.md` with a zero-padded prefix (`010-`, `020-`, …; lowest sorts first), ordered by importance: user-facing features, correctness fixes, performance, then internal/build/chore. Leave gaps and slot yours relative to existing files.

## Branch name

> [!REQUIRED]

Format `<type>/<short-description>` (e.g. `fix/split-chunks-cache-key`, `feat/css-modules-named-exports`), where `<type>` is one of `fix`, `feat`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`, `style`, `revert`, `docs` and matches the PR body's "What kind of change…" answer.

**Pick `<type>` from the diff** — never guess or reuse a previous task's. Inspect the staged changes and take the first match describing their _primary intent_:

1. `revert` — reverts a previous commit.
2. `fix` — corrects incorrect runtime behavior; normally with a regression test.
3. `feat` — new user-facing capability or option (touches `schemas/`, `lib/config/`, or adds public API).
4. `perf` — faster builds or less memory, behavior unchanged.
5. `refactor` — restructures `lib/` without behavior change or features.
6. `test` — only `test/`.
7. `docs` — only documentation (`*.md`, example READMEs, JSDoc-only prose).
8. `build` — build system or dependencies (`package.json`, `tooling/`, generators).
9. `ci` — only `.github/`.
10. `style` — formatting only.
11. `chore` — anything else.

Classify mixed changes by primary purpose (a fix with a test is `fix`; a feature with docs is `feat`).

**PR/commit titles**: conventional-commit `type(scope): subject`, scope optional (`perf(css): …`, `feat(caching): …`, `fix: …`), `type` matching the branch prefix.

Never prefix with `claude/`, `claude-code/`, `bot/`, `ai/` or any tool/agent identifier. If the harness pre-created a branch with any other prefix (an agent identifier or the wrong `<type>`), rename it before the first push: `git branch -m <new-name>`.

## One ref per task — report the leftovers

> [!REQUIRED]

A task leaves **one** branch on `origin`: its PR's. Merged PR heads are deleted automatically here (unless a branch rule forbids it); what accumulates are refs no PR ever pointed at, which nothing finds later — a squash merge leaves no ancestry, so a landed draft looks like unmerged work. So:

- **Rename before the _first_ push** (`git branch -m` before any `git push`), so a pre-created name never reaches `origin`.
- **Don't rename a pushed branch** — its old name stays on `origin` for someone to delete by hand; pick the final name from the diff up front.
- **Never reuse a branch whose PR merged** — restart from `main` under a new name, or the ref carries an unrelated change under a misleading name.
- **Name every ref you leave**: end the task with a `Branches on origin:` line naming the PR's branch and any other ref the task pushed or found pre-created. Sessions often can't delete remote refs, so that line is the only record.

## Commit rules

> [!REQUIRED]

**Author identity (CLA):** the CLA check matches the author email to a GitHub account with a signed CLA, so the author is the requester's GitHub account — never a bot. Resolve in order:

1. An identity the user states in the task.
2. The requester's GitHub login + public no-reply email `<USER_ID>+<login>@users.noreply.github.com` (`USER_ID` from REST `/users/<login>`).
3. Otherwise **ask**.

```bash
git -c user.name="<login>" -c user.email="<email>" commit -m "…"
```

**No `Co-authored-by`/`Co-Authored-By` trailers, and never credit an AI or bot** (any `*[bot]` account, assistant no-reply address, or tool/agent identity) as author or co-author. This overrides any default commit template (e.g. a `Co-Authored-By: Claude …` line) — **always strip it**. The human requester is the only author; AI use is disclosed in the PR's **Use of AI** section. Bot co-author emails also break the CLA check.

**Keep commit bodies compact:** short imperative subject; body paragraphs only when the change needs them, kept tight. Compact-by-default (brief, expanding only when genuinely needed) governs every section of the issue and PR templates too.

## Before opening the PR — grow from current `main`

> [!REQUIRED]

**Open every PR from a branch not behind `main`, and keep it so.** Right before opening:

```bash
git fetch origin main
git rev-list --count HEAD..origin/main   # 0 means current; anything else is stale
```

If not `0`, **rebase** — never merge `main` in (a merge commit takes the committer's identity, which is how a bot address lands in history and fails EasyCLA; a rebase keeps the requester as author — see [Commit rules](#commit-rules)). Pass the same identity overrides:

```bash
git -c user.name="<login>" -c user.email="<email>" rebase origin/main
```

These set each replayed commit's **committer**; the **author**, which EasyCLA reads, carries through untouched — so check it, and rewrite any commit not authored by the requester (`git rebase -x 'git commit --amend --no-edit --reset-author'`) before pushing:

```bash
git log --format='%h author=%an <%ae> committer=%cn <%ce>' origin/main..HEAD
```

**Then re-run the tests covering your change**: git rebases text, not meaning, so a renamed helper, changed default or shared fixture landing on `main` can break your code with no conflict.

A stale base also makes CI lie both ways: `Code Size` and benchmarks compare against `main`'s last report, attributing commits your branch predates to you (a one-line diff reported as `+163 KiB`), and a red check may be a defect already fixed on `main`. So when `main` moves under a long-lived PR, don't read a cross-base comparison as a result: ask the requester before rebasing an open PR ([below](#watching-a-pr-and-updating-its-branch)), and once they agree, rebase locally as above, or use `update_pull_request_branch` when the repo is configured to rebase.

## Pull request body

> [!REQUIRED]

webpack uses an **org-wide** PR template that `gh pr create` does **not** prefill — paste it yourself. Every PR body, whatever its size or framing, contains **every** section below, in order, labels spelled exactly; write `n/a` where a section doesn't apply. Never delete sections or substitute another template (e.g. `## Summary` / `## Test plan`). Titles are plain text — raw `<`, `>`, never HTML entities.

**Write briefly and simply** — plain words, short sentences, no filler; the prose should read in about 30 seconds — code blocks, tables and other artifacts don't count toward it, but keep them small too. It orients reviewers rather than recapping the investigation: no walkthroughs of iterations or reverts; extra background goes in a linked issue/discussion, the relevant review thread, or the squash-merge commit body. Where another section of this guide requires rationale in the PR body, give enough to satisfy it.

Mistakes that block PRs: `## Summary` headings instead of `**Summary**` bold labels; omitting **Use of AI** (mandatory per the [webpack AI policy](https://github.com/webpack/governance/blob/main/AI_POLICY.md)); omitting or mis-answering **What kind of change…** (must match the branch prefix); dropping the HTML comment hints or leaving sections blank instead of `n/a`.

Paste this body (without the fence lines):

```markdown
<!-- Thanks for submitting a pull request! Please provide enough information so that others can review your pull request. -->

**Summary**

<!-- Explain the **motivation** for making this change. What existing problem does the pull request solve? -->
<!-- Try to link to an open issue for more information. -->
<!-- Any other information related to changes. -->

<!-- In addition to that please answer these questions: -->

**What kind of change does this PR introduce?**

<!-- E.g. a fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs or describe it if you did not find a suitable kind of change. -->

**Did you add tests for your changes?**

<!-- Please note: in most cases, if you change the code, we will not merge your changes unless you add tests. -->

**Does this PR introduce a breaking change?**

<!-- If this PR introduces a breaking change, please describe the impact and a migration path for existing applications. -->

**If relevant, what needs to be documented once your changes are merged or what have you already documented?**

<!-- List all the information that needs to be added to the documentation after merge that has already been documented in this PR. -->

**Use of AI**

<!-- If you have used AI, please state so here. Explain how you used it.
Make sure to read our AI policy (https://github.com/webpack/governance/blob/main/AI_POLICY.md) or your Pull Request may be closed due to irresponsible use of AI. -->
```

Answers (brief and simple; one sentence is often enough):

- **Summary** — motivation and the problem solved; link the issue. Use `Closes #…` / `Fixes #…` when the PR resolves it, `Refs #…` only for issues it merely relates to. **For a fix or improvement, show a real before/after under it** where one exists: the input code and what changed — the output, size (gzip), memory or CPU — as a short code block or two-row table, taken from an actual run, never invented.
- **What kind of change…** — one of fix, feat, refactor, perf, test, chore, ci, build, style, revert, docs.
- **Did you add tests…** — yes/no + which files.
- **Breaking change** — yes/no + migration path if yes.
- **Documentation** — doc updates, or `n/a`.
- **Use of AI** — that AI was used and how; omitting or misrepresenting it can get the PR closed per the AI policy.

## After push — verify PR body

After every `git push` of a new branch, check whether a PR was auto-created (webpack has this webhook); if so, `update_pull_request` to install the full template — the auto-created body never matches.

## Watching a PR, and updating its branch

> [!REQUIRED]

**Subscribe to every PR you open** (`subscribe_pr_activity`) as the last step of opening it — not a question for the requester. You own it until it lands, and [every check ends green](#after-opening-the-pr--every-check-ends-green) and [the automated reviews](#after-opening-the-pr--wait-for-the-automated-reviews) need the session awake. Stay subscribed until merged or closed, or the requester says stop.

Don't, unasked, **rebase or merge the base branch into the PR** — maintainers usually land PRs through their own pipeline. Merely being behind `main` isn't a defect; doing it unasked rewrites history their pipeline was about to handle, restarts every check, and can drop an approval. Do it when the requester asks or the PR is reported genuinely un-mergeable, and say which applies before pushing. Pushing your own commits to your own branch is free for work the requester asked for; anything changing how the PR gets landed needs asking.

**A question is not a go-ahead.** When the requester asks what happened, why, or whether you changed something, answer it and say what you would change, then wait for them to agree before pushing — even when the fix is for your own mistake.

## Writing on GitHub — ask first

> [!REQUIRED]

**Never post to GitHub on your own initiative.** Pushing to your own branch is fine; publishing text others read is not — PR comments, review replies, issue comments, PR body edits after opening (except installing the template over an auto-created body, [below](#after-push--verify-pr-body)), and every reply to any bot.

Reading is never banned. Bot noise may be skipped: status checks, a benchmark that swings on re-run, a coverage report still waiting on uploads, changeset/preview echoes — replying to those costs maintainers more attention than the finding.

Anything naming a possible bug, regression or improvement must be investigated, whoever raised it — being a bot is no reason to dismiss it; judge the claim. Reproduce it, then fix and push (no permission needed) or, if you believe it's wrong, bring it **into the session**: what you found, the reply you'd send, and let the requester decide whether to post. Never leave such a finding unanswered.

## After opening the PR — every check ends green

> [!REQUIRED]

**The target is the whole run green — every check.** A red check is never something to explain, defer or wait out; no wake on one ends without a pushed commit or a reply naming the blocker, and "that one isn't important" is not your call.

- **A check that failed once is re-run before it's believed.** Infrastructure fails (runner dies, network fetch times out, an engine crashes on its own bug — the tell is a job reporting every test passing then dying anyway). Re-run the failing job once; **if the re-run fails the same way, it is real** — root-cause and fix it, unless the job died before any test ran (checkout, install, runner loss): then report it in the session (posting on the PR needs the requester's OK, [below](#writing-on-github--ask-first)) and move on. No more re-runs, and never skip or disable a test to get green.
- **Coverage is read only once the uploading suites finish** (below).

Neither excuses a check you can run yourself: **one that reproduces locally is never re-run and shrugged at** — it's your failure until a run on unmodified `main` proves otherwise. Fix and push.

Read the failing job's log ([how](../AGENTS.md#read-ci-rather-than-re-running-it)), reproduce **only the named case**, fix the cause, re-run that case, then push — never re-run the whole job to find what the log already says. Two recurring failures:

- **cspell** rejects a word — reword (the codebase is American English, and [Naming](../AGENTS.md#naming) forbids abbreviations) or add a genuine term to `cspell.json`.
- **A snapshot lives in two suites** — `ConfigTestCases` and `ConfigCacheTestCases` both snapshot `configCases/`, and `--testPathPatterns=ConfigTestCases` doesn't match the latter. Use `yarn test:basic --testNamePattern="<case>" -u` (no path filter): the name filter covers that case in both suites, no full `test:basic` needed.

A measuring report (performance, memory, a preview build) is investigated and answered with evidence, not a reflex commit. Reproduce the claim first ([how](../AGENTS.md#verifying-a-performance-or-memory-change)); a comparison against a base that never ran, across different runner environments, or with a different set of co-running cases is an artifact and usually says so. Reporting an artifact as one is a green outcome; leaving it unexamined is not. Replying to the bot needs permission ([Writing on GitHub](#writing-on-github--ask-first)).

**Don't read, chase or act on coverage until every suite uploading it has finished.** Each suite uploads its flag on completion and the service recomputes after each, so until the last lands the number is a partial sum — a large drop, a comment rewritten in place with changing percentages — meaning "not all suites reported", not "coverage lost". The report names how many uploads the head still lacks; **read that line before the percentage**, and treat non-zero as "not ready". **A red coverage check while coverage changed is normal mid-run**, not a failure.

**Wait for those suites, not the whole run.** Uploaders are the jobs calling the coverage action in `.github/workflows/test.yml` — today `unit`, the `integration` jobs on Ubuntu `lts/*` and on Windows and macOS `24.x` (gated behind `lint`, `basic`, `unit`), `test262`, `syntax-equivalence (chrome)` and every `parser` leg; the other two browsers and the other `integration` jobs run uninstrumented. Read the workflow if they've moved. Benchmarks, code scanning, dependency review, preview publishing, type-coverage and the changeset echo never upload and can't move the number, so a coverage gap is safe to fix while they run or are red.

Once the uploaders are in, read the report; only then is a genuine patch gap worth a test. Chasing an intermediate number costs pointless commits and tempts `lib/` changes that exist only to move a percentage.

## After opening the PR — wait for the automated reviews

> [!REQUIRED]

Every webpack PR is reviewed automatically on the initial commit and every push, by whichever automated reviewers the repo enables. Always wait for them and address every comment; judge a bot's finding on the claim and reproduce it before deciding.

1. After `create_pull_request`, `subscribe_pr_activity` ([see above](#watching-a-pr-and-updating-its-branch)); reviews then wake the session — do **not** poll.
2. For each review comment: if correct, push a fix in a new commit — **including for bugs your own PR introduced**, the common case. If wrong, draft a reply and ask the requester before posting ([Writing on GitHub](#writing-on-github--ask-first)) — never ignore it silently.
3. Every push re-runs the reviewers; repeat step 2 until each one's latest review has zero outstanding threads.
4. `unsubscribe_pr_activity` only once every comment is handled and CI is green, or when the user says stop.

## While watching — report only what needs a decision

> [!REQUIRED]

**A wake that changes nothing ends with no message.** Report — in a line or two — only when:

- a review comment (human or bot, judged on the claim) needs an action or decision;
- a check failed for this PR's reason, with the fix pushed or what blocks it;
- a measuring report is **final** and moved: code size (read gzip), coverage once every uploader reported, a benchmark whose output doesn't disclaim itself;
- the PR merged or closed, or the requester must choose something.

**Never narrate the rest** — intermediate coverage recomputes, partial-upload percentages, bot echoes (changeset, preview publish, "review in progress"), a check turning green, lists of job states. That buries the one wake that matters.

**Nothing to report means an empty answer**, including where the harness asks for visible output: return nothing rather than the status line that request invites. A line saying a wake needed no action is the narration this forbids, and twenty of them over one run read as noise around the wake that did.

Silence isn't skipping: read every event and investigate what it names; this governs only what reaches the requester. A finding judged an artifact is still reported once, with evidence ([see above](#after-opening-the-pr--every-check-ends-green)).
