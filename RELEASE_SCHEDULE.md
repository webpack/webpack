# Releases

webpack follows [semantic versioning](https://semver.org/). This document describes when each kind of release happens and how it is produced.

## Release schedule

### Patch releases — as soon as possible

Bug fixes are not held for the next scheduled release. Once a fix is merged and verified on `main`, a patch release is published as soon as possible — often the same day. Regressions in a recent release and security fixes take priority over everything else.

### Minor releases — every 4 weeks, on Thursday

Feature work ships on a fixed cadence: a minor release every four weeks, on a Thursday. Everything merged into `main` before that date goes out with it; anything merged after waits for the next slot rather than delaying the release.

A scheduled release may be skipped when nothing user-facing has landed since the previous one.

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
