---
"webpack": minor
---

Support CSS Modules `@value` identifiers as `@import` URLs and inside `url()` functions, e.g. `@value path: "./other.css"; @import path;` and `@value bg: "./image.png"; .a { background: url(bg); }`
