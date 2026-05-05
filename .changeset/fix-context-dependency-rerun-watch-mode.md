---
"webpack": patch
---

Fix snapshot validity check for context dependencies in watch mode by treating watchpack's existence-only entries (`{}`) as cache misses. `addFileTimestamps` and `addContextTimestamps` accept these entries, but the cache types previously claimed everything was a fully-populated entry, so subsequent snapshot comparisons (and `getFileTimestamp`/`getContextTimestamp`) treated `{}` as a real timestamp and falsely invalidated snapshots — most visibly causing loaders that call `addContextDependency` to rerun once after the first change. The cache types now include `ExistenceOnlyTimeEntry`, and every cache lookup falls back to a fresh on-disk read when the cached entry is existence-only or lacks a `timestampHash` the snapshot expects.
