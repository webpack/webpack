---
"webpack": patch
---

Fix `NormalModuleFactory` parser/generator types:

- `module.generator.html` now uses `HtmlGeneratorOptions` instead of `EmptyGeneratorOptions` (the `extract` option was hidden from the `createGenerator` / `generator` hook types).
- WebAssembly (`webassembly/async`, `webassembly/sync`) generator hooks now use `EmptyGeneratorOptions` instead of `EmptyParserOptions`.
- `NormalModuleFactory#getParser` / `createParser` / `getGenerator` / `createGenerator` are now generic over the module-type string, returning the specific parser/generator class for known types (e.g. `JavascriptParser` for `"javascript/auto"`, `CssGenerator` for `"css"`, etc.) instead of always returning the base `Parser` / `Generator`.
