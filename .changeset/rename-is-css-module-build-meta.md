---
"webpack": patch
---

Rename CSS-prefixed identifiers to use `Css` for consistency with the rest of the CSS-related naming (`CssParser`, `CssGenerator`, `CssModule`, `cssData`, …): `buildMeta.isCSSModule` → `buildMeta.isCssModule`, typedef `CSSModuleTypes` → `CssModuleTypes`, typedef `CSSModuleCreateData` → `CssModuleCreateData`
