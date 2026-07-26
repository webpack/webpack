---
"webpack": patch
---

Guard `req.socket.setNoDelay` in the lazy-compilation backend for runtimes without it (e.g. Deno).
