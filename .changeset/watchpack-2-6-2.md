---
"webpack": patch
---

Update `watchpack` to 2.6.2: watch mode falls back to polling instead of reporting files as removed when the system runs out of file watchers, and no longer logs an error or misses a change when a file sits where a resolver looked for a directory, e.g. a `resolve.alias` pointing at a file.
