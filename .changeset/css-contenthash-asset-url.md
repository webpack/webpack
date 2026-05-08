---
"webpack": patch
---

Recompute the CSS chunk's `[contenthash]` and the rendered CSS bytes when an asset referenced by `url()`/`src()`/string in CSS changes its hashed filename.

Previously, the CSS module's hash only reflected the original request (e.g. `./logo.png`), so a content-only change to a referenced asset left the CSS chunk's `[contenthash]` and code-generated source unchanged. The emitted CSS file then either kept its old name with a stale URL inside, or got served from cache while the real asset filename had moved — both modes break long-term caching. `CssUrlDependency.updateHash` now folds the asset module's build hash into the CSS module's hash, and `AssetGenerator.generate` no longer lets a previous build's persisted `data.url` entry shadow the freshly computed URL.
