# Verifying a change

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps each rule as one line and links here. -->

How to prove a change before pushing it and how to read CI when it is red, behind the [Testing](../AGENTS.md#testing) rules.

## Changes that widen the blast radius

**Two kinds of change widen the blast radius.** Touching `schemas/**`, `lib/config/**`, or anything `yarn fix:special` generates moves the whole option surface. Still don't sweep suites locally: push, let CI sweep, and [read the failing job's log](#read-ci-rather-than-re-running-it). Locally run only the touched `configCases/`, `yarn lint:code` and `yarn fix:special` (whose output says whether a generated file is stale). `lint`, `basic` and `unit` gate the `integration` matrix in `.github/workflows/test.yml` (`integration: needs: [lint, basic, unit]`), so a red one — `lint` included — stops every integration upload, and coverage then computes patch coverage from whichever cheap suite did report: it reads like a coverage problem but isn't.

## Running lint

**Run every stage of `lint` before every push — not a chosen few, not only your files.** `yarn lint:types` plus `npx eslint <files>` is **not** "lint passed": it skips `lint:special` (fails on stale generated files) and `lint:spellcheck` (reads every Markdown file). `yarn fix` isn't it either — it regenerates and formats but doesn't type check or spellcheck — so **run `yarn lint` after it** (or all eleven stages by hand if an early one trips on sandbox drift). Read each stage's output whole: piping through `tail`/`grep` is how a finding just above the summary reaches CI instead of you.

**A generated file is stale as soon as any JSDoc it copies changes — prose included.** `types.d.ts` carries the comment above `process()`, not just its signature; a reworded comment, or a signature edited without its doc paragraph, fails `lint` with the same `types.d.ts need to be updated` a missing member gives. After splicing your hunks, diff your file against the generator's whole output for that symbol's **region**, not just the lines you meant to change.

`yarn lint` runs `lint:agents` and `lint:special` in sequence and the rest in parallel, so `lint:special` tripping on sandbox drift hides every later stage. If it reports declarations "need to be updated" that `main` reports too, run the rest by hand: `lint:agents`, `lint:code`, `lint:class-names`, `lint:redundant-casts`, `lint:escape-hatches`, `lint:types`, `lint:types-test`, `lint:types-benchmark`, `lint:types-module-test`, `lint:types-hot`, `fmt:check`, `lint:spellcheck`. `lint:types-test` catches `tsc` errors in `test/`; skipping it is how a red `lint` survives "lint passed locally".

## Long runs

**When a long run can't be avoided locally, start it once, in the background, with its output in a file** (benchmarks, parity corpora, a callgrind count), then wait for the completion notification: no progress polls and no re-armed waiters, since each one re-reads the whole session. Keep any scheduled wake under 55 minutes; past the 1-hour prompt cache a wake rewrites the whole context.

## Local failures and broad sweeps

A local failure is yours only if it doesn't reproduce on `main` — check in a worktree (`git worktree add <dir> origin/main`) first. Sandboxes routinely fail `Cli createColors`, `profiling-plugin` and the `many-replacements` cases for environment reasons, and the generated-declaration check flags files CI accepts. **Hard rule — no broad local sweeps**: never run the spec-conformance suites (`test:test262` alone takes tens of minutes, `test:html5lib`, `test:css-parsing`) or the full `test:integration` matrix as routine local verification — CI runs them on every push; locally, run the `configCases/` relevant to your change. Broad local sweeps cost minutes and, on a busy machine, manufacture timeouts that look like regressions. Narrow the pattern until a run takes seconds, and:

- **Never read pass/fail through a pipe** — `yarn test:base … | grep …` discards jest's exit code. Check the exit status or read the `Tests:` line.
- **Never attribute a failure without a base run** — re-run that exact case on unmodified files first; most surprises are pre-existing or contention flakes.

## Long checks belong to CI

When the only proof a change works is a check that takes longer than a few minutes, CI runs it, not the session. Examples: `yarn test:minify-corpora` and the other spec-conformance suites, `test:integration`, benchmarks.

- **Push, then wait for the result**: run the fast checks first (`yarn lint`, the touched unit tests and `configCases/`). Then push and subscribe to the PR, and let its CI completion wake the session. Never poll, and never run the same check locally while CI runs it.
- **On red, reproduce only the named case** from the failing job's log ([below](#read-ci-rather-than-re-running-it)).
- **Narrow before running locally**: when you must see a result before pushing, filter a long suite to the one table or case at issue (`-t "<name>"`).
- **A long local run can mislead**: a submodule or installed dependency that differs from the lockfile gives results CI won't reproduce. Check what CI ran against before trusting a local result.

## Read CI rather than re-running it

> [!REQUIRED]

**When CI is red, read its log instead of reproducing the whole job locally** — rediscovering one line by re-running `yarn lint` or a suite wastes minutes and tokens. Filter the run to failing jobs (`gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion=="failure" or .conclusion=="timed_out")'`, or `list_workflow_jobs`), read that job's log, then reproduce **only the named case**: `yarn test:base --testPathPatterns="<file>"`, `yarn test:basic --testNamePattern="<category> <case>"`, or `npx eslint <file>`.

**Read CI output through a file, not the context.** Every character a tool returns is re-read on every later turn of the session, so one 50k-character log costs far more than its first read. So:

- **Save the log and search it**: `gh run view --job <id> --log > <scratchpad>/job.log` (the whole log, since it only lands on disk; `--log-failed` can come back empty for a timed-out job), then `grep -n -A20 -E "FAIL|Error|✕" <scratchpad>/job.log`. With `get_job_logs`, pass `failed_only` (it skips `timed_out` jobs, so fetch those by `job_id`) and start at `tail_lines: 150` (enough to clear the trailing `Post job cleanup`), widening only when the error isn't in it.
- **Fetch check runs only when something changed them** since the last read (a push, a re-run, a CI-completed event), and read only the failing ones; a review or bot-comment wake needs no fresh listing.
- **The same goes for other large reports** (benchmark comparisons, coverage, bot review bodies): save or filter them before reading.
- **GitHub and CodSpeed tool results count too**: list check runs or pull requests with `gh api … --jq` into a file (failing checks only) or pass `minimal_output: true`, save CodSpeed comparisons to a file, and never call `list_triggers` (one call returns about 30k characters).

Traps: a step is not a job — `Run yarn lint` sits inside the `lint` job, and a step's id fetches the wrong log, so select the object with a `steps` array. And `yarn lint` stops at its first failing stage, so a CI failure in `lint:code` says nothing about later stages — just as a local `lint:special` complaint `main` also makes says nothing about CI.

## A failure with no error

> [!REQUIRED]

When a job fails with no error message — jest-worker's `Call retries were exceeded`, a thread or process exiting without a stack — the real error was swallowed, and every reproduction run before it is surfaced is a guess:

1. **Make the error print.** Add a temporary `uncaughtException` / `unhandledRejection` handler that writes the stack with `fs.writeSync(2, …)`, then exits non-zero so the failure stays one — under Bun in `test/harness/runtimes/bun-preload.js`, which every worker thread loads.
2. **Run the one named file the way CI does.** Bun: the version `.github/runtimes/Dockerfile` pins, the `test/patches/*.patch` the job applies, and `--workerThreads --workerIdleMemoryLimit=2048MB` — without a memory limit jest runs a single file in-band, with no worker thread at all.
3. **Cut it to one `it`.** `-t "<describe>"`, then a throwaway one-test file with just the trigger (one `process.stderr.write` in a Bun worker thread reproduced #22977's failure 4/4).
4. **Then fix it.** A runtime bug gets a workaround beside the existing ones in that runtime's preload, with a comment naming the bug; drop the temporary handler.

Full-suite runs, CPU-load runs, merged checkouts and stdin variants come only if step 3 does not reproduce: each costs 5–20 minutes and can fill the disk.
