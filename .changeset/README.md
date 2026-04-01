# Changesets

This folder contains changeset files used to track version updates for packages in the repository.

Changesets help maintainers determine:
- which packages should be released
- whether the release should be a patch, minor, or major update
- what summary should appear in release notes

When making a pull request that affects user-facing behavior, package APIs, bug fixes, or features, you may need to add a changeset.

Typical release types:
- `patch` → bug fixes, documentation fixes, small improvements
- `minor` → new backwards-compatible features
- `major` → breaking changes

To create a changeset locally:

```bash
pnpm changeset

