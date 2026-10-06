---
name: pre-push
description: Run before every push to this repo. Walks the AGENTS.md and docs/pull-requests.md checklist (lint, generated output, tests, changeset, branch, author, PR body) and ends in READY or NOT READY.
---

# Pre-push gate

Run every step in order against the current branch. A step that fails is fixed before the next one; nothing here is skipped because it "looks fine". Read each command's whole output, never through a pipe.

## 1. What changed

```sh
git fetch origin main
git diff --stat origin/main...HEAD
git log --format='%h %s author=%an <%ae>' origin/main..HEAD
```

Note which areas the diff touches: `lib/`, `declarations/`, `schemas/`, `tooling/`, `test/`, docs, a new or moved directory.

## 2. Regenerate and lint — every stage

```sh
yarn fix
yarn lint
```

`yarn lint` is an `&&` chain: a stage that trips hides the rest. If `lint:special` reports a declaration "need to be updated" that unmodified `main` also reports, run the remaining stages by hand (`lint:agents`, `lint:types`, `lint:types-test`, `lint:types-benchmark`, `lint:types-module-test`, `lint:types-hot`, `fmt:check`, `lint:spellcheck`). Rules: [AGENTS.md › Testing](../../../AGENTS.md#testing).

If `yarn fix` changed a generated file you didn't mean to touch, keep only your own hunks and verify them against the generator ([Do not touch](../../../AGENTS.md#do-not-touch)).

## 3. Tests covering the change

Targeted only:

```sh
yarn test:base --testPathPatterns="<pattern>"
yarn test:basic --testNamePattern="<category> <case>"   # a configCases/ case, both suites
```

A bug fix has a test that failed before the fix. New lines are covered ([coverage rule](../../../AGENTS.md#testing)). A `ConfigCacheTestCases` failure is read with [docs/caching.md](../../../docs/caching.md).

## 4. Repo invariants the diff may owe

- A file moved under `lib/`: `yarn find-deep-imports:check` and the six places a path hides ([Moving a file](../../../AGENTS.md#moving-a-file-out-of-lib-root)).
- A top-level directory added, renamed or removed: its bullet in [docs/architecture.md](../../../docs/architecture.md).
- An option added or renamed: every layer in [docs/options.md](../../../docs/options.md).
- Runtime code changed: every target, `yarn test:size` ([docs/runtime.md](../../../docs/runtime.md)).
- A performance claim: measured as [docs/performance.md](../../../docs/performance.md) says.

## 5. Changeset

A user-facing change has one file in `.changeset/`, in the format and ordering of [Adding a Changeset](../../../docs/pull-requests.md#adding-a-changeset); fold into a pending same-topic entry first. Internal tooling, tests and docs need none.

## 6. Branch, commits, base

- Branch is `<type>/<short-description>`, the type picked from the diff by the list in [Branch name](../../../docs/pull-requests.md#branch-name); no tool prefix. Rename before the first push.
- Every commit's author is the requester's GitHub account, no `Co-authored-by` trailer ([Commit rules](../../../docs/pull-requests.md#commit-rules)):

```sh
git log --format='%h author=%an <%ae> committer=%cn <%ce>' origin/main..HEAD
git rev-list --count HEAD..origin/main   # 0, or rebase (never merge main in)
```

## 7. PR body

The body is the full org template from [Pull request body](../../../docs/pull-requests.md#pull-request-body): every bold label, in order, `n/a` where unused, **What kind of change…** matching the branch type, **Use of AI** filled in, a real before/after under **Summary** for a fix or improvement.

## Report

End with one table, then the verdict:

| Step              | Result                   |
| ----------------- | ------------------------ |
| lint (all stages) | pass / stage that failed |
| generated output  | current / stale file     |
| tests             | pass / failing case      |
| invariants        | n/a / what was updated   |
| changeset         | present / n/a / missing  |
| branch & author   | ok / what to fix         |
| PR body           | complete / missing label |

**READY** only when every row passes; otherwise **NOT READY** with the rows to fix. After pushing, follow [After push](../../../docs/pull-requests.md#after-push--verify-pr-body) and subscribe to the PR.
