---
"webpack": patch
---

Move `escapeIdentifier` / `unescapeIdentifier` from `CssParser` to `walkCssTokens` and cache their results per-compilation, similar to `makePathsRelative`. The functions remain re-exported from `CssParser` for backwards compatibility. CSS files commonly reuse the same identifiers (class names, custom properties, keyframes) many times, so caching avoids repeated work during parsing and code generation.
