---
"webpack": minor
---

Add `output.resourceHints` (`boolean | "prefetch" | HtmlResourceHint[] | Function`) to emit `<link rel="preload/prefetch/modulepreload">` for the entry's initial dependency graph and for URL-referenced assets, plus `module.parser.<type>.urlHints` rule sets to apply `webpackPrefetch` / `webpackPreload` defaults to `new URL(...)` / CSS `url(...)` / HTML `<img src>` references. Hints emit into the extracted HTML `<head>` for HTML entries and via a chunk-startup JS runtime otherwise; `stats.entrypoints[name].resourceHints` exposes the resolved list for SSR frameworks.
