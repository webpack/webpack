---
"webpack": patch
---

Fix `NormalModuleFactory` hook types so `createParser`/`createGenerator` (and `parser`/`generator`) expose accurate per-module-type options:

- `module.generator.html` now uses `HtmlGeneratorOptions` instead of `EmptyGeneratorOptions` (the `extract` option was hidden).
- WebAssembly (`webassembly/async`, `webassembly/sync`) generator hooks now use `EmptyGeneratorOptions` instead of `EmptyParserOptions`.
