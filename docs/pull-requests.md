# Pull requests

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps its rules and a pointer here. -->

Every section below is **required** — follow it exactly.

## Pull request body

> [!REQUIRED]

webpack uses an **org-wide** PR template that `gh pr create` does **not** prefill — paste it yourself. Every PR body, whatever its size or framing, contains **every** section below, in order, labels spelled exactly; write `n/a` where a section doesn't apply. Never delete sections or substitute another template (e.g. `## Summary` / `## Test plan`). Titles are plain text — raw `<`, `>`, never HTML entities.

**Keep answers short — ideally one sentence, at most two or three**: the body orients reviewers rather than recapping the investigation, and a reviewer should read the whole body in well under 30 seconds. Where another section of this guide requires rationale in the PR body, give enough to satisfy it (concise multi-paragraph is fine). No bench tables, code blocks, or walkthroughs of iterations/reverts; put extra background in a linked issue/discussion, the relevant inline review thread, or the squash-merge commit body.

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

Answers (one sentence each is the target, two or three the maximum):

- **Summary** — motivation and the problem solved; link the issue. Use `Closes #…` / `Fixes #…` when the PR resolves it, `Refs #…` only for issues it merely relates to.
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

Don't, unasked, **rebase or merge the base branch into the PR** — maintainers usually land PRs through their own pipeline. Merely being behind `main` isn't a defect; doing it unasked rewrites history their pipeline was about to handle, restarts every check, and can drop an approval. Do it when the requester asks or the PR is reported genuinely un-mergeable, and say which applies before pushing. Pushing your own commits to your own branch is free; anything changing how the PR gets landed needs asking.

## Writing on GitHub — ask first

> [!REQUIRED]

**Never post to GitHub on your own initiative.** Pushing to your own branch is fine; publishing text others read is not — PR comments, review replies, issue comments, PR body edits after opening (except installing the template over an auto-created body, [below](#after-push--verify-pr-body)), and every reply to any bot.

Reading is never banned. Bot noise may be skipped: status checks, a benchmark that swings on re-run, a coverage report still waiting on uploads, changeset/preview echoes — replying to those costs maintainers more attention than the finding.

Anything naming a possible bug, regression or improvement must be investigated, whoever raised it — being a bot is no reason to dismiss it; judge the claim. Reproduce it, then fix and push (no permission needed) or, if you believe it's wrong, bring it **into the session**: what you found, the reply you'd send, and let the requester decide whether to post. Never leave such a finding unanswered.

## After opening the PR — every check ends green

> [!REQUIRED]

**The target is the whole run green — every check.** A red check is never something to explain, defer or wait out; no wake on one ends without a pushed commit or a reply naming the blocker, and "that one isn't important" is not your call.

- **A check that failed once is re-run before it's believed.** Infrastructure fails (runner dies, network fetch times out, an engine crashes on its own bug — the tell is a job reporting every test passing then dying anyway). Re-run the failing job; **if the re-run fails the same way, ignore it and move on** — no more re-runs, no rewriting working code around it, no holding the PR.
- **Coverage is read only once the uploading suites finish** (below).

Neither excuses a check you can run yourself: **one that reproduces locally is never re-run and shrugged at** — it's your failure until a run on unmodified `main` proves otherwise. Fix and push.

Read the failing job's log ([how](../AGENTS.md#read-ci-rather-than-re-running-it)), reproduce **only the named case**, fix the cause, re-run that case, then push — never re-run the whole job to find what the log already says. Two recurring failures:

- **cspell** rejects a word — reword (the codebase is American English, and [Naming](../AGENTS.md#naming) forbids abbreviations) or add a genuine term to `cspell.json`.
- **A snapshot lives in two suites** — `ConfigTestCases` and `ConfigCacheTestCases` both snapshot `configCases/`, and `--testPathPatterns=ConfigTestCases` doesn't match the latter. Use `yarn test:basic --testNamePattern="<case>" -u` (no path filter): the name filter covers that case in both suites, no full `test:basic` needed.

A measuring report (performance, memory, a preview build) is investigated and answered with evidence, not a reflex commit. Reproduce the claim first ([how](../AGENTS.md#verifying-a-performance-or-memory-change)); a comparison against a base that never ran, across different runner environments, or with a different set of co-running cases is an artifact and usually says so. Reporting an artifact as one is a green outcome; leaving it unexamined is not. Replying to the bot needs permission ([Writing on GitHub](#writing-on-github--ask-first)).

**Don't read, chase or act on coverage until every suite uploading it has finished.** Each suite uploads its flag on completion and the service recomputes after each, so until the last lands the number is a partial sum — a large drop, a comment rewritten in place with changing percentages — meaning "not all suites reported", not "coverage lost". The report names how many uploads the head still lacks; **read that line before the percentage**, and treat non-zero as "not ready". **A red coverage check while coverage changed is normal mid-run**, not a failure.

**Wait for those suites, not the whole run.** Uploaders are the jobs calling the coverage action in `.github/workflows/test.yml` — today `unit`, `integration` (sharded, most uploads, gated behind `lint`, `basic`, `unit`), `test262`, `syntax-equivalence (chrome)` and the `parser (css)` / `parser (html)` legs; the other two browsers and `parser (js)` run uninstrumented. Read the workflow if they've moved. Benchmarks, code scanning, dependency review, preview publishing, type-coverage and the changeset echo never upload and can't move the number, so a coverage gap is safe to fix while they run or are red.

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

Silence isn't skipping: read every event and investigate what it names; this governs only what reaches the requester. A finding judged an artifact is still reported once, with evidence ([see above](#after-opening-the-pr--every-check-ends-green)).
