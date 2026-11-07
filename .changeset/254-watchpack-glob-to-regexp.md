---
"webpack": patch
---

Update `watchpack` so a `sideEffects` glob with an unbalanced or invalid bracket or brace is matched as written instead of failing the build, and one with many `**/` no longer stalls it.
