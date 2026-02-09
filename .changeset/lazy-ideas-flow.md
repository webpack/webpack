---
"webpack": minor
---

Revert part of the createRequire generation behavior for `require("node:...")` to keep compatibility with those modules exports, e.g. `const EventEmitter = require("node:events");`.
