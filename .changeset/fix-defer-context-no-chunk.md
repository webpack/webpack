---
"webpack": patch
---

Fix deferred dynamic `import()` of a context module kept in the initial chunk being evaluated eagerly instead of on first access.
