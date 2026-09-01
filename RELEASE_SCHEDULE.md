# Releases

webpack follows [semantic versioning](https://semver.org/). This document describes when each kind of release happens and how it is produced.

## Release schedule

### Patch releases — as soon as possible

Bug fixes are not held for the next scheduled release. Once a fix is merged and verified on `main`, a patch release is published as soon as possible — often the same day. Regressions in a recent release and security fixes take priority over everything else.

### Minor releases — every 4 weeks, on Thursday

Feature work ships on a fixed cadence: a minor release every four weeks, on a Thursday. Everything merged into `main` before that date goes out with it; anything merged after waits for the next slot rather than delaying the release.

A scheduled release may be skipped when nothing user-facing has landed since the previous one.

#### The week after a minor — no new features

The first week of every four-week cycle is a stabilization window: **pull requests adding features are not merged for one week after a minor release.** Only bug fixes go into `main` during that week, so a regression reported against the fresh minor can be fixed and patched out on its own.

The point is that the patch releases of that week stay clean. If features were merged straight after a minor, every regression fix would drag whatever features had landed since out with it — a stream of small releases each mixing new behavior into what was meant to be a fix, and each one a new thing to bisect when the next report comes in.

Once the week is over, feature pull requests are merged as usual for the remaining three weeks of the cycle. Approved feature pull requests simply wait during the window; there is no need to close or rebase them.

### Out-of-band releases — critical fixes do not wait

The cadence above is for feature work. A release is published as soon as the fix is on `main`, without waiting for the four-week slot or the end of the stabilization window, when it contains:

- a security fix;
- a fix for a breaking change that shipped unintentionally (behavior a release changed without saying so);
- a fix for anything else critical — a regression that breaks common builds, corrupts output, or has no workaround.

Such a release carries only the fix and whatever else has already landed; nothing is held back for it and no feature is merged to accompany it.

### Major releases — only after a roadmap discussion

Major releases are not scheduled. A new major happens only after the roadmap and the other aspects requiring significant changes — breaking changes, the supported Node.js range, migration effort for the ecosystem, and the work needed in loaders, plugins and the documentation — have been discussed publicly and agreed on by the [Core Working Group](./WORKING_GROUP.md).

If you are proposing a change that requires a major, open a [discussion](https://github.com/webpack/webpack/discussions) first — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## What goes into which release

| Bump    | Contents                                                                          |
| ------- | --------------------------------------------------------------------------------- |
| `patch` | Bug fixes, performance improvements, internal refactors, dependency updates.      |
| `minor` | New features, new configuration options, new public API — backwards compatible.   |
| `major` | Breaking changes to the config schema, the public API, or the supported runtimes. |

Every user-facing pull request carries a [changeset](./.changeset/README.md) declaring its bump level; see the "Adding a Changeset" section of [AGENTS.md](./AGENTS.md) for the format.

A change that does not affect the published package — repository documentation, CI or tests only — needs no changeset: it is not released on its own and does not appear in the changelog.

## How a release is made

Releases are automated with [changesets](https://github.com/changesets/changesets) — see [`.github/workflows/release.yml`](./.github/workflows/release.yml):

1. Every push to `main` updates a `chore(release): new release` pull request that consumes the pending changesets, bumps the version in `package.json` and writes [`CHANGELOG.md`](./CHANGELOG.md).
2. Merging that pull request publishes the new version to npm and creates the matching GitHub release and git tag.
3. The release is then announced on Discord, and the documentation update on [webpack.js.org](https://webpack.js.org/) is triggered automatically.

So cutting a release means merging the release pull request — the timing of that merge is what the schedule above describes.
