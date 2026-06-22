---
"webpack": minor
---

Add a `deno` target (with versions, e.g. `deno`, `deno2`, `deno1.40`) that emits ESM, resolves node.js built-ins via the required `node:` specifier, and keeps Deno's own import protocols (`npm:`, `jsr:`, `node:`, `http(s)://`) external.
