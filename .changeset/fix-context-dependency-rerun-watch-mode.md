---
"webpack": patch
---

Fix snapshot validity check for context dependencies in watch mode by treating watchpack's existence-only entries (`{}`) as cache misses.
