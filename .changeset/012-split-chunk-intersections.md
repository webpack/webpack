---
"webpack": minor
---

Add `optimization.splitChunks.dedupDepth` to discover shared chunk intersections before enforcing size limits. It defaults to `1` in production (including an omitted mode) and `0` in development or none. `0` uses existing combinations; `1` intersects original sets; each further round also uses sets found in previous rounds. Discovery stops when no new sets remain. Higher depths can increase computation exponentially.

The option accepts integers from `0` to `4294967295` and cannot be overridden in cache groups. Discovery applies to unnamed groups with a positive `minSize` or `minSizeReduction`; all normal extraction constraints still apply. Candidates are rebuilt from remaining original module-chunk edges between cache-group priorities.
