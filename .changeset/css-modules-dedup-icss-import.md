---
"webpack": patch
---

Fix CSS modules deduplication so a `.module.<ext>` file imported both directly (JS) and via icss (`composes from` / `:import`) becomes a single module instance. Previously the default rule on `dependency: /css-import-(local|global)-module/` forced the icss-imported instance to type `css/module` even for `.module.css` files that the auto rule already classified as modules — producing two module instances of the same file with different `localIdent` hashes, duplicated CSS output, and chained class names in the JS export. The dependency rule now `exclude`s `.module.<ext>`, matching css-loader's single-instance output.

Note: as a side effect, parser options configured under `module.parser["css/auto"]` (e.g. `dashedIdents: false`) now also apply to `.module.<ext>` files reached via icss-import, where they were previously silently overridden by the forced `css/module` type. To opt back into the old behavior for icss-imported files, configure the same parser options under `module.parser["css/module"]` as well.
