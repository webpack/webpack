---
"webpack": patch
---

Reduce peak V8 heap usage of `SourceMapDevToolPlugin` on large builds by emitting the external `.map` asset as a `Buffer` instead of a V8 string. The emitted asset lives in `compilation.assets` for the rest of the build, so storing its bytes as off-heap external memory keeps the JSON content out of the V8 heap and avoids holding the same content twice when V8 internally widens it. See issue #20961.
