---
"webpack": minor
---

Add `output.resourceHints` with `chunks` (preload the HTML entry's initial dependency graph) and `assets` (rule-matched prefetch/preload for URL-referenced fonts / images / workers via `webpackPrefetch` / `webpackPreload` magic comments on JS `new URL(...)`, CSS `url(...)`, HTML `<img src>`). Hints emit into the extracted HTML `<head>` for HTML entries and via a chunk-startup JS runtime otherwise.
