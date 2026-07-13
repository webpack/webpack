---
"webpack": minor
---

Add `output.html.resourceHints` (off by default): `true` preloads the entry's initial chunk graph, or pass `<link>` descriptors / a per-page function for custom hints; add `output.environment.modulePreload` with an ES5 polyfill for environments lacking native support.
