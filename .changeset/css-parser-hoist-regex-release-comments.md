---
"webpack": patch
---

Hoist per-call CSS parser regexes to module scope and keep parsed comments in local parse state so they are not retained on the reused parser instance between modules.
