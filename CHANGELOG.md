# webpack

## 5.105.3

### Patch Changes

- Context modules now handle rejections correctly. (by [@alexander-akait](https://github.com/alexander-akait) in [#20455](https://github.com/webpack/webpack/pull/20455))

- Only mark asset modules as side-effect-free when `experimental.futureDefaults` is set to true, so asset-copying use cases (e.g. `import "./x.png"`) won’t break unless the option is enabled. (by [@hai-x](https://github.com/hai-x) in [#20535](https://github.com/webpack/webpack/pull/20535))

- Add the missing **webpack_exports** declaration in certain cases when bundling a JS entry together with non-JS entries (e.g., CSS entry or asset module entry). (by [@hai-x](https://github.com/hai-x) in [#20463](https://github.com/webpack/webpack/pull/20463))

- Fixed HMR failure for CSS modules with @import when exportType !== "link". When exportType is not "link", CSS modules now behave like JavaScript modules and don't require special HMR handling, allowing @import CSS to work correctly during hot module replacement. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20514](https://github.com/webpack/webpack/pull/20514))

- Fixed an issue where empty JavaScript files were generated for CSS-only entry points. The code now correctly checks if entry modules have JavaScript source types before determining whether to generate a JS file. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20454](https://github.com/webpack/webpack/pull/20454))

- Do not crash when a referenced chunk is not a runtime chunk. (by [@alexander-akait](https://github.com/alexander-akait) in [#20461](https://github.com/webpack/webpack/pull/20461))

- Fix some types. (by [@alexander-akait](https://github.com/alexander-akait) in [#20412](https://github.com/webpack/webpack/pull/20412))

- Ensure that missing module error are thrown after the interception handler (if present), allowing module interception to customize the module factory. (by [@hai-x](https://github.com/hai-x) in [#20510](https://github.com/webpack/webpack/pull/20510))

- Added `createRequire` support for ECMA modules. (by [@stefanbinoj](https://github.com/stefanbinoj) in [#20497](https://github.com/webpack/webpack/pull/20497))

- Added category for CJS reexport dependency to fix issues with ECMA modules. (by [@hai-x](https://github.com/hai-x) in [#20444](https://github.com/webpack/webpack/pull/20444))

- Implement immutable bytes for `bytes` import attribute to match tc39 spec. (by [@alexander-akait](https://github.com/alexander-akait) in [#20481](https://github.com/webpack/webpack/pull/20481))

- Fixed deterministic search for graph roots regardless of edge order. (by [@veeceey](https://github.com/veeceey) in [#20452](https://github.com/webpack/webpack/pull/20452))

## 5.105.2

### Patch Changes

- Fixed `WebpackPluginInstance` type regression. (by [@alexander-akait](https://github.com/alexander-akait) in [#20440](https://github.com/webpack/webpack/pull/20440))

## 5.105.1

### Patch Changes

- Fix VirtualUrlPlugin Windows compatibility by sanitizing cache keys and filenames. Cache keys now use `toSafePath` to replace colons (`:`) with double underscores (`__`) and sanitize other invalid characters, ensuring compatibility with Windows filesystem restrictions. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20424](https://github.com/webpack/webpack/pull/20424))

- Revert part of the createRequire generation behavior for `require("node:...")` to keep compatibility with those modules exports, e.g. `const EventEmitter = require("node:events");`. (by [@hai-x](https://github.com/hai-x) in [#20433](https://github.com/webpack/webpack/pull/20433))

- Skip guard collection when exports-presence mode is disabled to improve parsing performance. (by [@hai-x](https://github.com/hai-x) in [#20433](https://github.com/webpack/webpack/pull/20433))

## 5.105.0

### Minor Changes

- Allow resolving worker module by export condition name when using `new Worker()` (by [@hai-x](https://github.com/hai-x) in [#20353](https://github.com/webpack/webpack/pull/20353))

- Detect conditional imports to avoid compile-time linking errors for non-existent exports. (by [@hai-x](https://github.com/hai-x) in [#20320](https://github.com/webpack/webpack/pull/20320))

- Added the `tsconfig` option for the `resolver` options (replacement for `tsconfig-paths-webpack-plugin`). Can be `false` (disabled), `true` (use the default `tsconfig.json` file to search for it), a string path to `tsconfig.json`, or an object with `configFile` and `references` options. (by [@alexander-akait](https://github.com/alexander-akait) in [#20400](https://github.com/webpack/webpack/pull/20400))

- Support `import.defer()` for context modules. (by [@ahabhgk](https://github.com/ahabhgk) in [#20399](https://github.com/webpack/webpack/pull/20399))

- Added support for array values ​​to the `devtool` option. (by [@hai-x](https://github.com/hai-x) in [#20191](https://github.com/webpack/webpack/pull/20191))

- Improve rendering node built-in modules for ECMA module output. (by [@hai-x](https://github.com/hai-x) in [#20255](https://github.com/webpack/webpack/pull/20255))

- Unknown import.meta properties are now determined at runtime instead of being statically analyzed at compile time. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20312](https://github.com/webpack/webpack/pull/20312))

### Patch Changes

- Fixed ESM default export handling for `.mjs` files in Module Federation (by [@y-okt](https://github.com/y-okt) in [#20189](https://github.com/webpack/webpack/pull/20189))

- Optimized `import.meta.env` handling in destructuring assignments by using cached stringified environment definitions. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20313](https://github.com/webpack/webpack/pull/20313))

- Respect the `stats.errorStack` option in stats output. (by [@samarthsinh2660](https://github.com/samarthsinh2660) in [#20258](https://github.com/webpack/webpack/pull/20258))

- Fixed a bug where declaring a `module` variable in module scope would conflict with the default `moduleArgument`. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20265](https://github.com/webpack/webpack/pull/20265))

- Fix VirtualUrlPlugin to set resourceData.context for proper module resolution. Previously, when context was not set, it would fallback to the virtual scheme path (e.g., `virtual:routes`), which is not a valid filesystem path, causing subsequent resolve operations to fail. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20390](https://github.com/webpack/webpack/pull/20390))

- Fixed Worker self-import handling to support various URL patterns (e.g., `import.meta.url`, `new URL(import.meta.url)`, `new URL(import.meta.url, import.meta.url)`, `new URL("./index.js", import.meta.url)`). Workers that resolve to the same module are now properly deduplicated, regardless of the URL syntax used. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20381](https://github.com/webpack/webpack/pull/20381))

- Reuse the same async entrypoint for the same Worker URL within a module to avoid circular dependency warnings when multiple Workers reference the same resource. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20345](https://github.com/webpack/webpack/pull/20345))

- Fixed a bug where a self-referencing dependency would have an unused export name when imported inside a web worker. (by [@samarthsinh2660](https://github.com/samarthsinh2660) in [#20251](https://github.com/webpack/webpack/pull/20251))

- Fix missing export generation when concatenated modules in different chunks share the same runtime in module library bundles. (by [@hai-x](https://github.com/hai-x) in [#20346](https://github.com/webpack/webpack/pull/20346))

- Fixed `import.meta.env.xxx` behavior: when accessing a non-existent property, it now returns empty object instead of full object at runtime. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20289](https://github.com/webpack/webpack/pull/20289))

- Improved parsing error reporting by adding a link to the loader documentation. (by [@gaurav10gg](https://github.com/gaurav10gg) in [#20244](https://github.com/webpack/webpack/pull/20244))

- Fix typescript types. (by [@alexander-akait](https://github.com/alexander-akait) in [#20305](https://github.com/webpack/webpack/pull/20305))

- Add declaration for unused harmony import specifier. (by [@hai-x](https://github.com/hai-x) in [#20286](https://github.com/webpack/webpack/pull/20286))

- Fix compressibility of modules while retaining portability. (by [@dmichon-msft](https://github.com/dmichon-msft) in [#20287](https://github.com/webpack/webpack/pull/20287))

- Optimize source map generation: only include `ignoreList` property when it has content, avoiding empty arrays in source maps. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20319](https://github.com/webpack/webpack/pull/20319))

- Preserve star exports for dependencies in ECMA module output. (by [@hai-x](https://github.com/hai-x) in [#20293](https://github.com/webpack/webpack/pull/20293))

- Consider asset modulem to be side-effect free. (by [@hai-x](https://github.com/hai-x) in [#20352](https://github.com/webpack/webpack/pull/20352))

- Avoid generating JavaScript modules for CSS exports that are not used, reducing unnecessary output and bundle size. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20337](https://github.com/webpack/webpack/pull/20337))

## 5.104.1

### Patch Changes

- 2efd21b: Reexports runtime calculation should not accessing **WEBPACK_IMPORT_KEY** decl with var.
- c510070: Fixed a user information bypass vulnerability in the HttpUriPlugin plugin.

## 5.104.0

### Minor Changes

- d3dd841: Use method shorthand to render module content in `__webpack_modules__` object.
- d3dd841: Enhance `import.meta.env` to support object access.
- 4baab4e: Optimize dependency sorting in updateParent: sort each module only once by deferring to finishUpdateParent(), and reduce traversal count in sortWithSourceOrder by caching WeakMap values upfront.
- 04cd530: Handle more at-rules for CSS modules.
- cafae23: Added options to control the renaming of at-rules and various identifiers in CSS modules.
- d3dd841: Added `base64url`, `base62`, `base58`, `base52`, `base49`, `base36`, `base32` and `base25` digests.
- 5983843: Provide a stable runtime function variable `__webpack_global__`.
- d3dd841: Improved `localIdentName` hashing for CSS.

### Patch Changes

- 22c48fb: Added module existence check for informative error message in development mode.
- 50689e1: Use the fully qualified class name (or export name) for `[fullhash]` placeholder in CSS modules.
- d3dd841: Support universal lazy compilation.
- d3dd841: Fixed module library export definitions when multiple runtimes.
- d3dd841: Fixed CSS nesting and CSS custom properties parsing.
- d3dd841: Don't write fragment from URL to filename and apply fragment to module URL.
- aab1da9: Fixed bugs for `css/global` type.
- d3dd841: Compatibility `import.meta.filename` and `import.meta.dirname` with `eval` devtools.
- d3dd841: Handle nested `__webpack_require__`.
- 728ddb7: The speed of identifier parsing has been improved.
- 0f8b31b: Improve types.
- d3dd841: Don't corrupt `debugId` injection when `hidden-source-map` is used.
- 2179fdb: Re-validate HttpUriPlugin redirects against allowedUris, restrict to http(s) and add a conservative redirect limit to prevent SSRF and untrusted content inclusion. Redirects failing policy are rejected before caching/lockfile writes.
- d3dd841: Serialize `HookWebpackError`.
- d3dd841: Added ability to use built-in properties in dotenv and define plugin.
- 3c4319f: Optimizing the regular expression character class by specifying ranges for runtime code.
- d3dd841: Reduce collision for local indent name in CSS.
- d3dd841: Remove CSS link tags when CSS imports are removed.
