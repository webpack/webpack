---
"webpack": patch
---

Fixed Worker self-import handling to support various URL patterns (e.g., `import.meta.url`, `new URL(import.meta.url)`, `new URL(import.meta.url, import.meta.url)`, `new URL("./index.js", import.meta.url)`). Workers that resolve to the same module are now properly deduplicated, regardless of the URL syntax used.
