---
"webpack": patch
---

`asset/source` module namespace objects no longer include `__esModule` property when `outputModule` is enabled. Per the `CreateDefaultExportSyntheticModule` spec (used by both tc39/proposal-import-text and tc39/proposal-json-modules), the namespace should only contain `"default"`. In non-outputModule (CJS) mode, the legacy behavior is preserved for backward compatibility.
