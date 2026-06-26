# webpack

## 5.108.1

### Patch Changes

- Fix invalid property access for escaped namespace imports with multi-character mangled export names. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#21280](https://github.com/webpack/webpack/pull/21280))

- Add frames to ProfilingPlugin TracingStartedInBrowser event so the trace loads in Chrome DevTools. (by [@alexander-akait](https://github.com/alexander-akait) in [#21269](https://github.com/webpack/webpack/pull/21269))

## 5.108.0

### Minor Changes

- Treat top-level await and `import.meta` as ES module markers, matching Node.js syntax detection so no explicit module type is needed. (by [@alexander-akait](https://github.com/alexander-akait) in [#21218](https://github.com/webpack/webpack/pull/21218))

- Add a `bun` target that emits ESM and externalizes `bun:*` and node.js built-in modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#21248](https://github.com/webpack/webpack/pull/21248))

- Support CommonJS reexports via `Object.defineProperty` value and getter descriptors. (by [@alexander-akait](https://github.com/alexander-akait) in [#21129](https://github.com/webpack/webpack/pull/21129))

- Support JSON Schema `const` when generating CLI flags from a schema. (by [@alexander-akait](https://github.com/alexander-akait) in [#21087](https://github.com/webpack/webpack/pull/21087))

- Support JSON Schema `if`/`then`/`else` when generating CLI flags from a schema. (by [@alexander-akait](https://github.com/alexander-akait) in [#21087](https://github.com/webpack/webpack/pull/21087))

- Skip import specifiers, `require()` and `import()` calls in dead conditional branches gated by inlined imported constants (`isDEV ? A : B`), evaluated via `getCondition`. (by [@hai-x](https://github.com/hai-x) in [#21136](https://github.com/webpack/webpack/pull/21136))

- CSS `localIdentName` `[hash]` now resolves to the local ident hash (matching css-loader); use `[modulehash]` for the module hash. (by [@alexander-akait](https://github.com/alexander-akait) in [#21259](https://github.com/webpack/webpack/pull/21259))

- Add CSS parser `as` option and resolve `url()` inside HTML `style` attributes. (by [@alexander-akait](https://github.com/alexander-akait) in [#21157](https://github.com/webpack/webpack/pull/21157))

- Add dedicated module classes for all built-in module types. (by [@alexander-akait](https://github.com/alexander-akait) in [#21164](https://github.com/webpack/webpack/pull/21164))

- Support `.html`/`.css` for the default `./src` entry under the html/css experiments. (by [@alexander-akait](https://github.com/alexander-akait) in [#21039](https://github.com/webpack/webpack/pull/21039))

- Add `defineConfig` helper for typed configuration files. (by [@alexander-akait](https://github.com/alexander-akait) in [#21169](https://github.com/webpack/webpack/pull/21169))

- Add a `deno` target (with versions, e.g. `deno`, `deno2`, `deno1.40`) that emits ESM, resolves node.js built-ins via the required `node:` specifier, and keeps Deno's own import protocols (`npm:`, `jsr:`, `node:`, `http(s)://`) external. (by [@alexander-akait](https://github.com/alexander-akait) in [#21247](https://github.com/webpack/webpack/pull/21247))

- Use `module-import` for electron externals when the target supports ESM. (by [@alexander-akait](https://github.com/alexander-akait) in [#21184](https://github.com/webpack/webpack/pull/21184))

- Add `output.environment.logicalAssignment` to emit `||=` in runtime code when the target supports logical assignment operators. (by [@bjohansebas](https://github.com/bjohansebas) in [#21219](https://github.com/webpack/webpack/pull/21219))

- Resolve and rewrite asset URLs inside `<iframe srcdoc>` in HTML modules. (by [@bjohansebas](https://github.com/bjohansebas) in [#21226](https://github.com/webpack/webpack/pull/21226))

- Add HMR support for HTML modules with body/title DOM patching on update. (by [@alexander-akait](https://github.com/alexander-akait) in [#21011](https://github.com/webpack/webpack/pull/21011))

- Add `css-url` html source type extracting `url()` references from CSS-valued attributes. (by [@alexander-akait](https://github.com/alexander-akait) in [#21250](https://github.com/webpack/webpack/pull/21250))

- Add `module.parser.html.sources` option to disable or customize URL-attribute extraction for HTML modules, with `script` / `script-module` / `stylesheet` / `stylesheet-inline` types for custom attributes (by [@alexander-akait](https://github.com/alexander-akait) in [#21022](https://github.com/webpack/webpack/pull/21022))

- Add `module.parser.html.template` option to transform HTML module source before parsing. (by [@alexander-akait](https://github.com/alexander-akait) in [#21055](https://github.com/webpack/webpack/pull/21055))

- Extract more source URLs in HTML modules (SVG, legacy and obsolete attributes). (by [@alexander-akait](https://github.com/alexander-akait) in [#21241](https://github.com/webpack/webpack/pull/21241))

- Inline `export default <const>` when the default-exported value is a primitive constant. (by [@hai-x](https://github.com/hai-x) in [#21189](https://github.com/webpack/webpack/pull/21189))

- Support `optimization.inlineExports` for better tree-shaking. (by [@hai-x](https://github.com/hai-x) in [#20973](https://github.com/webpack/webpack/pull/20973))

- Re-encode inline hash digests (`[contenthash]`/`[chunkhash]`/`[fullhash]`/`[modulehash]`) from the full content hash, so they carry full entropy and work under `optimization.realContentHash` and in dynamically-loaded chunk filenames; also preserve leading zero bytes in base-N digests. (by [@alexander-akait](https://github.com/alexander-akait) in [#21267](https://github.com/webpack/webpack/pull/21267))

- Allow tree-shaking unused calls to `/*#__NO_SIDE_EFFECTS__*/`-annotated (pure) exports across module boundaries. (by [@hai-x](https://github.com/hai-x) in [#20907](https://github.com/webpack/webpack/pull/20907))

- Defer building unused re-export targets of side-effect-free barrel modules. (by [@hai-x](https://github.com/hai-x) in [#21165](https://github.com/webpack/webpack/pull/21165))

- Keep export mangling enabled for modules whose namespace object is used as a whole value, by materializing a decoupled namespace object that keeps the original export names. (by [@alexander-akait](https://github.com/alexander-akait) in [#21234](https://github.com/webpack/webpack/pull/21234))

- Add `output.environment.let` option (paired with target's `let` capability) and emit `let`/`const` instead of `var` in generated runtime code wherever it is safe. Bindings that may be wrapped in runtime-condition `if` blocks (harmony imports, ConcatenatedModule external imports) continue to use `var` to preserve function scoping. (by [@alexander-akait](https://github.com/alexander-akait) in [#21010](https://github.com/webpack/webpack/pull/21010))

- Add `output.html` to emit an HTML file per entrypoint, injecting its JS/CSS chunks (including `dependOn` shared chunks). (by [@alexander-akait](https://github.com/alexander-akait) in [#21215](https://github.com/webpack/webpack/pull/21215))

- Add `module.parser.javascript.pureFunctions` to mark top-level names as side-effect-free for tree shaking. (by [@hai-x](https://github.com/hai-x) in [#21063](https://github.com/webpack/webpack/pull/21063))

- Add `universal` to `compiler.platform`, true for universal targets (`"universal"` or `["web", "node"]`). (by [@bjohansebas](https://github.com/bjohansebas) in [#21252](https://github.com/webpack/webpack/pull/21252))

- Add `output.strictModuleResolution` to gate the runtime `MODULE_NOT_FOUND` guard. (by [@hai-x](https://github.com/hai-x) in [#21067](https://github.com/webpack/webpack/pull/21067))

- Support an inline digest in hash path placeholders, e.g. `[contenthash:base64:8]`. (by [@alexander-akait](https://github.com/alexander-akait) in [#21259](https://github.com/webpack/webpack/pull/21259))

- Support `[uniqueName]` and its `[uniquename]` alias in template paths. (by [@alexander-akait](https://github.com/alexander-akait) in [#21155](https://github.com/webpack/webpack/pull/21155))

- Support CSS in Node for universal targets, collecting styles for SSR. (by [@alexander-akait](https://github.com/alexander-akait) in [#21208](https://github.com/webpack/webpack/pull/21208))

- Improve commonjs, node-commonjs and global externals for universal targets. (by [@alexander-akait](https://github.com/alexander-akait) in [#21187](https://github.com/webpack/webpack/pull/21187))

- Add a `universal` target preset (browser + web worker + Node.js + Electron + NW.js) that always outputs ECMAScript modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#21214](https://github.com/webpack/webpack/pull/21214))

- Support `new Worker(new URL(...))` in universal (node + web) targets by resolving the Worker constructor from `worker_threads` when no global `Worker` exists. (by [@alexander-akait](https://github.com/alexander-akait) in [#21195](https://github.com/webpack/webpack/pull/21195))

- Add `output.workerChunkFilename` and `entry.worker` for worker chunk filenames. (by [@alexander-akait](https://github.com/alexander-akait) in [#21128](https://github.com/webpack/webpack/pull/21128))

### Patch Changes

- Skip re-parsing the inlined entry module when no renaming is needed. (by [@alexander-akait](https://github.com/alexander-akait) in [#21167](https://github.com/webpack/webpack/pull/21167))

- Extend the avoidEntryIife no-parse fast path to multi-entry chunks. (by [@alexander-akait](https://github.com/alexander-akait) in [#21173](https://github.com/webpack/webpack/pull/21173))

- Reuse the binary deserialize dispatch table to speed up cache restore. (by [@alexander-akait](https://github.com/alexander-akait) in [#21175](https://github.com/webpack/webpack/pull/21175))

- Type `buildInfo` and `buildMeta` per module type with shared common properties. (by [@alexander-akait](https://github.com/alexander-akait) in [#21172](https://github.com/webpack/webpack/pull/21172))

- Avoid copying module runtime requirements when ownership is not transferred. (by [@alexander-akait](https://github.com/alexander-akait) in [#21140](https://github.com/webpack/webpack/pull/21140))

- Keep all CommonJS exports when an exported function accesses them via `this`. (by [@alexander-akait](https://github.com/alexander-akait) in [#21179](https://github.com/webpack/webpack/pull/21179))

- Align CLI color-support detection across Node, Deno and Bun. (by [@alexander-akait](https://github.com/alexander-akait) in [#21257](https://github.com/webpack/webpack/pull/21257))

- Include the schema origin path in conflicting-schema CLI argument errors. (by [@alexander-akait](https://github.com/alexander-akait) in [#21087](https://github.com/webpack/webpack/pull/21087))

- Reject `__proto__`, `constructor` and `prototype` path segments in `cli.processArguments` to prevent prototype pollution. (by [@alexander-akait](https://github.com/alexander-akait) in [#21057](https://github.com/webpack/webpack/pull/21057))

- Speed up `Compilation.deleteAsset` and `Compilation.renameAsset` via a lazy reverse index from asset file name to containing chunks. (by [@alexander-akait](https://github.com/alexander-akait) in [#21035](https://github.com/webpack/webpack/pull/21035))

- Fix merging of inner modules' top-level declarations in concatenated modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#21170](https://github.com/webpack/webpack/pull/21170))

- Reduce allocations in export hashing and concatenation name lookups. (by [@alexander-akait](https://github.com/alexander-akait) in [#21167](https://github.com/webpack/webpack/pull/21167))

- Avoid toLowerCase allocations in CSS keyword comparisons. (by [@alexander-akait](https://github.com/alexander-akait) in [#21109](https://github.com/webpack/webpack/pull/21109))

- Speed up CSS identifier escaping with a char-class lookup table. (by [@alexander-akait](https://github.com/alexander-akait) in [#21109](https://github.com/webpack/webpack/pull/21109))

- Resolve `[fullhash]` in `url()` public paths for inlined CSS export types (`style`/`text`/`css-style-sheet`) at runtime. (by [@alexander-akait](https://github.com/alexander-akait) in [#21054](https://github.com/webpack/webpack/pull/21054))

- Avoid quadratic line scan when building CSS module exports source maps. (by [@alexander-akait](https://github.com/alexander-akait) in [#21109](https://github.com/webpack/webpack/pull/21109))

- Compute CSS comment source locations lazily. (by [@alexander-akait](https://github.com/alexander-akait) in [#21109](https://github.com/webpack/webpack/pull/21109))

- Support inline hash digest and length in CSS module `localIdentName` placeholders. (by [@alexander-akait](https://github.com/alexander-akait) in [#21259](https://github.com/webpack/webpack/pull/21259))

- Resolve full CSS escapes (including hex) in CSS-Modules names, so e.g. `\75 rl()` matches `url()`. (by [@alexander-akait](https://github.com/alexander-akait) in [#21196](https://github.com/webpack/webpack/pull/21196))

- Reduce CSS parser CPU (hoisted per-call regexes, byte-compared `@container` pure-mode keywords) and stop retaining parsed comments on the reused parser instance between modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#21202](https://github.com/webpack/webpack/pull/21202))

- Reduce CSS build time and memory usage. Per-export CSS dependencies are consolidated into one dependency per module, and hot-path allocations and lookups in CSS code generation and the module-graph cache are trimmed. (by [@alexander-akait](https://github.com/alexander-akait) in [#21114](https://github.com/webpack/webpack/pull/21114))

- Cache CSS public-path placeholder offsets per module source to avoid re-materializing and re-scanning the source on every render. (by [@alexander-akait](https://github.com/alexander-akait) in [#21054](https://github.com/webpack/webpack/pull/21054))

- Fix CSS tokenizer infinite loops and dropped tokens on malformed input. (by [@alexander-akait](https://github.com/alexander-akait) in [#21102](https://github.com/webpack/webpack/pull/21102))

- Speed up CSS identifier unescaping with bulk run flushing. (by [@alexander-akait](https://github.com/alexander-akait) in [#21109](https://github.com/webpack/webpack/pull/21109))

- Skip already-visited symlink targets when resolving context hashes so cyclic symlink graphs no longer overflow the queue. (by [@alexander-akait](https://github.com/alexander-akait) in [#21088](https://github.com/webpack/webpack/pull/21088))

- Resolve `DefinePlugin` access to an undefined object member as `undefined`. (by [@alexander-akait](https://github.com/alexander-akait) in [#21040](https://github.com/webpack/webpack/pull/21040))

- Avoid materializing dependency source locations when sorting, keeping them lazy to reduce build time and memory. (by [@alexander-akait](https://github.com/alexander-akait) in [#21228](https://github.com/webpack/webpack/pull/21228))

- Speed up serialization deserialize by replacing a Buffer.isBuffer call with a typeof check. (by [@hai-x](https://github.com/hai-x) in [#21203](https://github.com/webpack/webpack/pull/21203))

- Emit assets with absolute target paths as-is to avoid invalid Windows paths. (by [@alexander-akait](https://github.com/alexander-akait) in [#21223](https://github.com/webpack/webpack/pull/21223))

- Add `output.environment.spread`, `output.environment.hasOwn`, and `output.environment.symbol`, and use method shorthand, spread, `Object.hasOwn`, and an unguarded `Symbol` in generated runtime code where the environment supports it. (by [@alexander-akait](https://github.com/alexander-akait) in [#21188](https://github.com/webpack/webpack/pull/21188))

- Drop the unused loadScript runtime from ESM hot-update bundles. (by [@alexander-akait](https://github.com/alexander-akait) in [#21208](https://github.com/webpack/webpack/pull/21208))

- Extend value binding optimization to export default expressions. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#21117](https://github.com/webpack/webpack/pull/21117))

- Reduce ExportInfo memory and cache size for inline-exports metadata. (by [@alexander-akait](https://github.com/alexander-akait) in [#21171](https://github.com/webpack/webpack/pull/21171))

- Resolve nested exports info paths iteratively to cut per-level array allocations. (by [@alexander-akait](https://github.com/alexander-akait) in [#21137](https://github.com/webpack/webpack/pull/21137))

- Fix stale incremental cache for css, html and asset/source/inline modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#21108](https://github.com/webpack/webpack/pull/21108))

- CommonJS tree-shaking no longer drops exports accessed before a deferred require binding. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#21123](https://github.com/webpack/webpack/pull/21123))

- Make CSS-referenced asset available in lazy JS chunk during incremental rebuilds. (by [@alexander-akait](https://github.com/alexander-akait) in [#21100](https://github.com/webpack/webpack/pull/21100))

- Correct string/template import specifier parsing for filesystem cache build dependencies and fix module-sharing hostname validation. (by [@alexander-akait](https://github.com/alexander-akait) in [#21232](https://github.com/webpack/webpack/pull/21232))

- perf: guard isDeferred() behind experiments.deferImport in ConcatenatedModule (by [@shashank-u03](https://github.com/shashank-u03) in [#21096](https://github.com/webpack/webpack/pull/21096))

- Speed up deterministicGrouping and cached comparators on large builds. (by [@alexander-akait](https://github.com/alexander-akait) in [#21197](https://github.com/webpack/webpack/pull/21197))

- Reduce allocations on harmony/commonjs dependency hot paths. (by [@alexander-akait](https://github.com/alexander-akait) in [#21180](https://github.com/webpack/webpack/pull/21180))

- Force-load a module's new owning chunk during HMR when its only loaded chunk is removed from a runtime, so it keeps receiving updates. (by [@alexander-akait](https://github.com/alexander-akait) in [#21131](https://github.com/webpack/webpack/pull/21131))

- Fix HTML parser adoption agency to handle a `nobr` shielded by a marker. (by [@alexander-akait](https://github.com/alexander-akait) in [#21274](https://github.com/webpack/webpack/pull/21274))

- Expand HTML parser tag/attribute coverage and decode character references. (by [@alexander-akait](https://github.com/alexander-akait) in [#21159](https://github.com/webpack/webpack/pull/21159))

- Speed up and reduce allocations in the experimental HTML parser's tokenizer, tree builder, and entity decoder. (by [@alexander-akait](https://github.com/alexander-akait) in [#21152](https://github.com/webpack/webpack/pull/21152))

- Speed up the experimental HTML parser and reduce its memory usage. (by [@alexander-akait](https://github.com/alexander-akait) in [#21130](https://github.com/webpack/webpack/pull/21130))

- Avoid redundant HTML module work: reuse the dependency-template render across the JS and HTML code-generation passes, and memoize sentinel resolution/content hashing per source. (by [@alexander-akait](https://github.com/alexander-akait) in [#21054](https://github.com/webpack/webpack/pull/21054))

- Release inner-graph state after use and speed up inlined-export checks. (by [@alexander-akait](https://github.com/alexander-akait) in [#21167](https://github.com/webpack/webpack/pull/21167))

- Reduce JavascriptParser allocations on the walk hot path to speed up parsing and lower memory usage. (by [@alexander-akait](https://github.com/alexander-akait) in [#21139](https://github.com/webpack/webpack/pull/21139))

- Reduce CPU and memory overhead of the lazy barrel optimization. (by [@alexander-akait](https://github.com/alexander-akait) in [#21213](https://github.com/webpack/webpack/pull/21213))

- Keep the error message in module build errors on engines whose `Error.stack` omits it. (by [@alexander-akait](https://github.com/alexander-akait) in [#21239](https://github.com/webpack/webpack/pull/21239))

- Speed up module concatenation by caching repeated per-module computations. (by [@alexander-akait](https://github.com/alexander-akait) in [#21115](https://github.com/webpack/webpack/pull/21115))

- Move the `hot` flag from `Module` to `NormalModule`, where it's actually read and written. (by [@alexander-akait](https://github.com/alexander-akait) in [#21028](https://github.com/webpack/webpack/pull/21028))

- Move the `weak` flag from `Dependency` to `ModuleDependency`, where it's actually set. (by [@alexander-akait](https://github.com/alexander-akait) in [#21111](https://github.com/webpack/webpack/pull/21111))

- Avoid the entry IIFE for multiple inlined entry modules by renaming collisions. (by [@alexander-akait](https://github.com/alexander-akait) in [#21151](https://github.com/webpack/webpack/pull/21151))

- Reject `new import.defer(...)`/`new import.source(...)` with member access as a SyntaxError. (by [@alexander-akait](https://github.com/alexander-akait) in [#21211](https://github.com/webpack/webpack/pull/21211))

- Avoid `ProvidePlugin` injection for local CommonJS require bindings that use the same variable name. (by [@fireairforce](https://github.com/fireairforce) in [#21041](https://github.com/webpack/webpack/pull/21041))

- Resolve the global `new Worker(new URL(...))` to `worker_threads` on the `node` target. (by [@alexander-akait](https://github.com/alexander-akait) in [#21217](https://github.com/webpack/webpack/pull/21217))

- Use optional chaining in generated runtime code where the environment supports it. (by [@alexander-akait](https://github.com/alexander-akait) in [#21186](https://github.com/webpack/webpack/pull/21186))

- Allow output.path to be the filesystem root by treating EISDIR like EEXIST in mkdirp. (by [@alexander-akait](https://github.com/alexander-akait) in [#21223](https://github.com/webpack/webpack/pull/21223))

- Reduce memory by not retaining the source location object on every dependency. (by [@alexander-akait](https://github.com/alexander-akait) in [#21183](https://github.com/webpack/webpack/pull/21183))

- Keep the full exports object when a `require()` binding is re-exported. (by [@alexander-akait](https://github.com/alexander-akait) in [#21144](https://github.com/webpack/webpack/pull/21144))

- Replace glob-to-regexp dependency with watchpack's globToRegExp utility. (by [@hai-x](https://github.com/hai-x) in [#21176](https://github.com/webpack/webpack/pull/21176))

- Shrink the persistent cache: add a NULL_AND_I16 binary tier and inline tiny strings instead of larger far back-references. (by [@hai-x](https://github.com/hai-x) in [#21210](https://github.com/webpack/webpack/pull/21210))

- Type serializer read/write contexts with positional tuples and fix a ProvideSharedDependency version/request swap. (by [@alexander-akait](https://github.com/alexander-akait) in [#21201](https://github.com/webpack/webpack/pull/21201))

- Speed up buildChunkGraph by deriving block modules from the first runtime. (by [@alexander-akait](https://github.com/alexander-akait) in [#21166](https://github.com/webpack/webpack/pull/21166))

- Cache re-export target resolution in SideEffectsFlagPlugin for faster builds. (by [@alexander-akait](https://github.com/alexander-akait) in [#21085](https://github.com/webpack/webpack/pull/21085))

- Skip pure single-star passthrough modules for `export *` re-exports. (by [@alexander-akait](https://github.com/alexander-akait) in [#21085](https://github.com/webpack/webpack/pull/21085))

- Skip dependency error/warning reporting for unchanged modules on rebuilds. (by [@alexander-akait](https://github.com/alexander-akait) in [#21154](https://github.com/webpack/webpack/pull/21154))

- Use value descriptors instead of getters for const export bindings. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#21021](https://github.com/webpack/webpack/pull/21021))

- Apply CSS hot updates on the Node side of a universal target. (by [@alexander-akait](https://github.com/alexander-akait) in [#21217](https://github.com/webpack/webpack/pull/21217))

- Guard CSS `style` export-type injection so it no-ops when there is no `document`. (by [@alexander-akait](https://github.com/alexander-akait) in [#21193](https://github.com/webpack/webpack/pull/21193))

- Avoid building warning stats objects when counting warnings without a filter. (by [@alexander-akait](https://github.com/alexander-akait) in [#21198](https://github.com/webpack/webpack/pull/21198))

- Recognize forward-slash Windows absolute paths (e.g. C:/dir) consistently. (by [@alexander-akait](https://github.com/alexander-akait) in [#21223](https://github.com/webpack/webpack/pull/21223))

## 5.107.2

### Patch Changes

- Reduce per-file overhead in `ContextModuleFactory.resolveDependencies` by batching `alternativeRequests` hook calls. Previously the hook was invoked once per file in the context (with a single-item array), paying per-call overhead (closure allocation, `resolverFactory.get`, intermediate arrays in `RequireContextPlugin`) for every file. The hook is now invoked once per directory with all matched files in one batch — `RequireContextPlugin`'s tap already iterates the items array, so the output is unchanged. Steady-state rebuild on a 4000-file `require.context` drops a further ~15 ms (after the watch-mode purge fix in the same release). (by [@alexander-akait](https://github.com/alexander-akait) in [#21020](https://github.com/webpack/webpack/pull/21020))

- Include each external info's `runtimeCondition` in `ConcatenatedModule#updateHash` so changes to a concatenated external's runtime condition invalidate persistent caches instead of slipping through with the module id alone. (by [@alexander-akait](https://github.com/alexander-akait) in [#21023](https://github.com/webpack/webpack/pull/21023))

- Fix HTML `[contenthash]` for referenced asset and inline-style URL changes. (by [@alexander-akait](https://github.com/alexander-akait) in [#21018](https://github.com/webpack/webpack/pull/21018))

- Resolve chunk-hash placeholders in chunk URLs embedded into extracted HTML. (by [@alexander-akait](https://github.com/alexander-akait) in [#21018](https://github.com/webpack/webpack/pull/21018))

- Remove unnecessary `__webpack_require__` runtime helpers in ESM library output with multi-module chunks. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#21032](https://github.com/webpack/webpack/pull/21032))

- Rewrite `NormalModule#getSideEffectsConnectionState` walk as an allocation-light iterative loop instead of a generator trampoline, restoring rebuild performance lost in #20993 while keeping deep import chains stack-safe. (by [@alexander-akait](https://github.com/alexander-akait) in [#21014](https://github.com/webpack/webpack/pull/21014))

- Fix runtime `ReferenceError` on the first activation of a lazy-compiled module when `output.library.type` produces a closure-wrapped bundle (`umd`, `umd2`, `amd`, `amd-require`, `system`). (by [@alexander-akait](https://github.com/alexander-akait) in [#21013](https://github.com/webpack/webpack/pull/21013))

  External modules of these types reference closure-bound identifiers like `__WEBPACK_EXTERNAL_MODULE_react__`, supplied by the library wrapper that is generated once per chunk. When `lazyCompilation` activates an entry or import for the first time, any external dependency the lazily-built module pulls in arrives in a hot-update chunk that lives outside the original wrapper closure, so its factory body cannot resolve the closure identifier and only a manual page refresh recovers.

  The inactive `LazyCompilationProxyModule` now declares statically-enumerable externals (string and object forms of `externals`) as its own dependencies, so the initial entry chunk's library wrapper already exposes their closure identifiers. When activation later pulls in those externals through the lazily-compiled module, they resolve to the already-installed factories instead of throwing. Function and RegExp externals are not pre-populated because their effective request set isn't knowable up front.

- Fill in missing `entryOptions` when an async block joins an existing entrypoint. (by [@alexander-akait](https://github.com/alexander-akait) in [#21026](https://github.com/webpack/webpack/pull/21026))

- Release per-child `codeGenerationResults` in `MultiCompiler` and at `Compiler.close` to reduce memory retention. (by [@alexander-akait](https://github.com/alexander-akait) in [#21015](https://github.com/webpack/webpack/pull/21015))

- Reduce peak memory of `SourceMapDevToolPlugin` on large builds (closes #20961). (by [@alexander-akait](https://github.com/alexander-akait) in [#20963](https://github.com/webpack/webpack/pull/20963))

- Fix slow `require.context()` / dynamic `import()` rebuilds in watch mode (#13636). When a file inside a watched context directory changed, `NodeWatchFileSystem` would call `inputFileSystem.purge(contextDir)`. The enhanced-resolve `purge` implementation matches cache keys with `key.startsWith(contextDir)`, so the stat cache of every file under the directory was discarded on every rebuild — `ContextModuleFactory.resolveDependencies` then re-`stat`-ed the whole tree on each rebuild. Single-file rebuilds on a 4000-file context now reuse the warm stat cache, dropping median rebuild from ~1260 ms to ~650 ms in a local reproduction (≈49%). For directory items that are explicitly watched contexts, `purge` is now called with `{ exact: true }` (added in `enhanced-resolve@5.22.0`) so only the directory's own entry is invalidated; file-level changes in the same aggregated event continue to purge file stats and the parent `readdir` as before. (by [@alexander-akait](https://github.com/alexander-akait) in [#21020](https://github.com/webpack/webpack/pull/21020))

## 5.107.1

### Patch Changes

- Align the experimental HTML tokenizer with the WHATWG spec: fix offset-range bugs in the script-data, content-mode end-tag, attribute-value, and EOF states; surface tokenizer parse errors to consumers via a new `parseError` callback (`"warning"` when the tokenizer recovers and the emitted token is still well-formed, `"error"` when the offset range is incomplete — e.g. `eof-in-tag`); and add the full WHATWG named character references table so `decodeHtmlEntities` handles all named entities (including legacy bare forms like `&AMP` and multi-code-point entities like `&NotEqualTilde;`) with proper longest-prefix backtracking. (by [@alexander-akait](https://github.com/alexander-akait) in [#21000](https://github.com/webpack/webpack/pull/21000))

- Tree-shake CommonJS modules imported through a `const NAME = require(LITERAL)` binding when only static members of `NAME` are read. Previously webpack treated every export of such modules as referenced (because the bare `require()` dependency reports `EXPORTS_OBJECT_REFERENCED`), so unused `exports.x = ...` assignments remained in the bundle even with `usedExports` enabled. The parser now forwards `NAME.x` / `NAME.x()` / `NAME["x"]` accesses to the underlying `CommonJsRequireDependency` as referenced exports, falling back to the full exports object the moment `NAME` is read in any other context (passed by value, destructured later, accessed with a dynamic key, …). This brings the binding form to parity with the existing destructuring form (`const { x } = require(...)`). (by [@alexander-akait](https://github.com/alexander-akait) in [#21003](https://github.com/webpack/webpack/pull/21003))

- Fix `RangeError: Maximum call stack size exceeded` thrown from `HarmonyImportSideEffectDependency.getModuleEvaluationSideEffectsState` on long linear chains of side-effect-free imports. `NormalModule.getSideEffectsConnectionState` previously descended through `HarmonyImportSideEffectDependency.getModuleEvaluationSideEffectsState` recursively, adding two stack frames per module, which overflowed V8's stack at a few thousand modules deep. The traversal is now iterative. (by [@alexander-akait](https://github.com/alexander-akait) in [#20993](https://github.com/webpack/webpack/pull/20993))

- Fix `NormalModuleFactory` parser/generator types: (by [@alexander-akait](https://github.com/alexander-akait) in [#20999](https://github.com/webpack/webpack/pull/20999))
  - `module.generator.html` now uses `HtmlGeneratorOptions` instead of `EmptyGeneratorOptions` (the `extract` option was hidden from the `createGenerator` / `generator` hook types).
  - WebAssembly (`webassembly/async`, `webassembly/sync`) generator hooks now use `EmptyGeneratorOptions` instead of `EmptyParserOptions`.
  - `NormalModuleFactory#getParser` / `createParser` / `getGenerator` / `createGenerator` are now generic over the module-type string, returning the specific parser/generator class for known types (e.g. `JavascriptParser` for `"javascript/auto"`, `CssGenerator` for `"css"`, etc.) instead of always returning the base `Parser` / `Generator`.
  - `NormalModuleCreateData` is now generic over the module type so `parser`, `parserOptions`, `generator`, and `generatorOptions` are narrowed to the specific class / options for the given `type`.

- Link import bindings used inside `define(...)` callbacks in ES modules. Previously, `HarmonyDetectionParserPlugin` skipped walking the arguments of `define` calls in harmony modules, so references to imported bindings inside an inline AMD `define` factory (e.g. `define(function () { console.log(foo); })`) were not rewritten to their imported references and could cause `ReferenceError` at runtime. Inner graph usage analysis is also fixed for the related pattern `const fn = function () { foo; }; define(fn);`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20990](https://github.com/webpack/webpack/pull/20990))

- HTML-entry pipeline (`experiments.html` + `experiments.css`): emit `<link rel="stylesheet">` tags for CSS chunks reachable from a `<script src>` entry. Previously when the bundled JS imported CSS, the resulting `.css` file was emitted to disk but never referenced from the extracted HTML (no `<link>` tag), and when `splitChunks` extracted CSS into sibling chunks the HTML cloned the originating `<script>` for each one — producing `<script src="style.js">` pointing at non-existent JS filenames instead of `<link rel="stylesheet" href="style.css">`. CSS chunks are now sorted by the entrypoint's module post-order index so the `<link>` tags also appear in source import order, fixing the cascade ordering issue documented in `html-webpack-plugin#1838` and `webpack/mini-css-extract-plugin#959` for HTML-entry builds. `nonce`/`crossorigin`/`referrerpolicy` are copied from the originating tag onto the emitted `<link>`. (by [@alexander-akait](https://github.com/alexander-akait) in [#21002](https://github.com/webpack/webpack/pull/21002))

- Allow `devtool` and `SourceMapDevToolPlugin` (or multiple `SourceMapDevToolPlugin` instances) to coexist on the same asset. Previously the second instance would silently skip any asset whose `info.related.sourceMap` had already been set by an earlier instance, and even when it ran the asset had been rewrapped as a `RawSource` so no source map could be recovered — producing an empty `.map` file. The plugin now keeps a per-compilation stash of pristine source maps, namespaces its persistent cache entries by the options that affect output, and appends additional `related.sourceMap` entries instead of overwriting them. The classic workaround of pairing `devtool: 'hidden-source-map'` with a `new webpack.SourceMapDevToolPlugin({ filename: '[file].secondary.map', noSources: true })` now produces both maps in a single build. (by [@alexander-akait](https://github.com/alexander-akait) in [#21001](https://github.com/webpack/webpack/pull/21001))

- Narrow `TemplatePathFn` callback types by context. `pathData.chunk` is now non-optional for chunk filename callbacks (`output.filename`, `chunkFilename`, `cssFilename`, `cssChunkFilename`, `htmlFilename`, `htmlChunkFilename`, `optimization.splitChunks.cacheGroups[*].filename`), and `pathData.module` is non-optional for module filename callbacks (`output.assetModuleFilename`, per-module `generator.filename` / `generator.outputPath`, `module.parser.css.localIdentName`). (by [@alexander-akait](https://github.com/alexander-akait) in [#20987](https://github.com/webpack/webpack/pull/20987))

- Tighten the `CreateData` typedef in `NormalModuleFactory`. `CreateData` now represents the fully-populated value passed to the `createModule`, `module`, and `createModuleClass` hooks (`NormalModuleCreateData & { settings: ModuleSettings }`), while `ResolveData.createData` is typed as `Partial<CreateData>` to reflect the empty initial state. Plugins tapping those hooks no longer need to cast individual fields away from optional. (by [@alexander-akait](https://github.com/alexander-akait) in [#20992](https://github.com/webpack/webpack/pull/20992))

- Stop `webpackPrefetch` / `webpackPreload` magic comments from leaking across `import()` call sites that share a `webpackChunkName`. When two imports targeted the same named chunk and only one of them set `webpackPrefetch: true`, the prefetch directive was applied from every parent chunk that referenced the named chunk. Prefetch and preload orders are now resolved per `import()` call site instead of from the shared chunk group's accumulated options. (by [@alexander-akait](https://github.com/alexander-akait) in [#20994](https://github.com/webpack/webpack/pull/20994))

- Fix `[fullhash:N]` and `[hash:N]` (with length suffix) in `output.publicPath` not being interpolated at runtime. The detection regex in `RuntimePlugin` only matched `[fullhash]` / `[hash]` without a length suffix, so the `PublicPathRuntimeModule` was not flagged as a full-hash module and `__webpack_require__.p` was emitted with the placeholder `XXXX` left in place (e.g. `out/XXXX/`) instead of the real hash truncated to the requested length. (by [@alexander-akait](https://github.com/alexander-akait) in [#21004](https://github.com/webpack/webpack/pull/21004))

- Re-export `ModuleNotFoundError` from `webpack/lib/ModuleNotFoundError` for backward compatibility with old plugins that import it from that path. This re-export will be removed in webpack 6. (by [@alexander-akait](https://github.com/alexander-akait) in [#20988](https://github.com/webpack/webpack/pull/20988))

## 5.107.0

### Minor Changes

- Add `module.generator.javascript.anonymousDefaultExportName` option to control whether webpack sets `.name` to `"default"` for anonymous default export functions and classes per ES spec. Defaults to `true` for applications and `false` for libraries (when `output.library` is set) to avoid unnecessary bundle size overhead. Also extract anonymous default export `.name` fix-up into a shared runtime helper (`__webpack_require__.dn`), replacing repeated inline `Object.defineProperty` / `Object.getOwnPropertyDescriptor` calls with a single short call per module to reduce output size. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20894](https://github.com/webpack/webpack/pull/20894))

- Support module concatenation (scope hoisting) for CSS modules with `text`, `css-style-sheet`, `style`, and `link` export types (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20851](https://github.com/webpack/webpack/pull/20851))

- The `generator.exportsConvention` function form for CSS modules now accepts `string[]` in addition to `string`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20914](https://github.com/webpack/webpack/pull/20914))

- Add `linkInsert` hook to `CssLoadingRuntimeModule.getCompilationHooks(compilation)` so plugin developers can control where stylesheet `<link>` elements are inserted into the document. (by [@alexander-akait](https://github.com/alexander-akait) in [#20947](https://github.com/webpack/webpack/pull/20947))

- Add `CssModulesPlugin.getCompilationHooks(compilation).orderModules` hook. (by [@alexander-akait](https://github.com/alexander-akait) in [#20978](https://github.com/webpack/webpack/pull/20978))

- Add a `pure` parser option for `css/module` and `css/auto` types matching `postcss-modules-local-by-default`'s pure mode: every selector must contain at least one local class or id, otherwise webpack emits a build error. (by [@alexander-akait](https://github.com/alexander-akait) in [#20946](https://github.com/webpack/webpack/pull/20946))

- Support CSS Modules `@value` identifiers as `@import` URLs and inside `url()` functions, e.g. `@value path: "./other.css"; @import path;` and `@value bg: "./image.png"; .a { background: url(bg); }` (by [@alexander-akait](https://github.com/alexander-akait) in [#20925](https://github.com/webpack/webpack/pull/20925))

- Add experimental TypeScript support via `experiments.typescript: true` (auto-enabled by `experiments.futureDefaults`). Uses Node.js's built-in `module.stripTypeScriptTypes` (Node.js >= 22.6 with the stable `mode: "strip"` API, including Node.js 26) to transform `.ts`, `.cts`, `.mts`, `data:text/typescript`, and `data:application/typescript` modules — no type checking, only erasable TypeScript (types, generics, `import type`, casts). `.tsx`/JSX and non-erasable syntax (`enum`, `namespace`, parameter-property constructors, decorator metadata) are NOT supported; use a TSX-capable loader (e.g. `ts-loader`, `swc-loader`) for those. (by [@alexander-akait](https://github.com/alexander-akait) in [#20964](https://github.com/webpack/webpack/pull/20964))

- Added an `experiments.html` flag that reserves the `html` module type for the first-class HTML entry-point support. (by [@aryanraj45](https://github.com/aryanraj45) in [#20902](https://github.com/webpack/webpack/pull/20902))

- Preserve `defer` / `source` import phase keywords on external dependencies in ESM output, the same way import attributes are preserved. (by [@alexander-akait](https://github.com/alexander-akait) in [#20934](https://github.com/webpack/webpack/pull/20934))

- Support the `#__NO_SIDE_EFFECTS__` annotation to mark functions as pure for better tree-shaking. (by [@hai-x](https://github.com/hai-x) in [#20775](https://github.com/webpack/webpack/pull/20775))

- Add `module.generator.html.extract` for HTML modules and the matching `output.htmlFilename` / `output.htmlChunkFilename` filename templates (defaults derived from `output.filename` / `output.chunkFilename` with `.js` swapped for `.html`, mirroring the CSS pipeline). When extraction is on, the parsed and URL-rewritten HTML is emitted as a standalone `.html` output file alongside the module's JavaScript export. (by [@alexander-akait](https://github.com/alexander-akait) in [#20979](https://github.com/webpack/webpack/pull/20979))

- Add `"module-sync"` to default `conditionNames` for resolver defaults to align with Node.js, which exposes the `module-sync` community condition for synchronously-loadable ESM. (by [@alexander-akait](https://github.com/alexander-akait) in [#20933](https://github.com/webpack/webpack/pull/20933))

### Patch Changes

- Fix CSS modules `composes` so `composes: foo from "./self.module.css"` from inside `self.module.css` no longer creates a duplicate module instance. Fix CSS modules `composes` parsing so `local()` and `global()` function wrappers are tracked per class name. Fix CSS modules `composes: ... from "<file>"` so the composed files load in an order consistent with every rule's local composes order, instead of source first-appearance order. (by [@alexander-akait](https://github.com/alexander-akait) in [#20929](https://github.com/webpack/webpack/pull/20929))

- Avoid emitting the `__webpack_require__` runtime in CSS bundles when all imported CSS modules were concatenated into the same scope. (by [@alexander-akait](https://github.com/alexander-akait) in [#20936](https://github.com/webpack/webpack/pull/20936))

- Recompute the CSS chunk's `[contenthash]` and the rendered CSS bytes when an asset referenced by `url()`/`src()`/string in CSS changes its hashed filename. (by [@alexander-akait](https://github.com/alexander-akait) in [#20938](https://github.com/webpack/webpack/pull/20938))

- Embed an inline `sourceMappingURL` data URI inside the CSS when the `parser.exportType` option are `text`, `style`, or `css-style-sheet`. Also merge `@import`ed CSS at build time for `text` and `css-style-sheet` exportTypes so the bundle ships a single accurate inline source map covering every contributing file. Map each generated CSS-module class export line in the JS bundle back to its selector position in the original CSS file (e.g. `btn: "..."` → `.btn { ... }`). (by [@alexander-akait](https://github.com/alexander-akait) in [#20886](https://github.com/webpack/webpack/pull/20886))

- Fix CSS modules deduplication so a `.module.<ext>` file imported both directly (JS) and via icss (`composes from` / `:import`) becomes a single module instance. (by [@alexander-akait](https://github.com/alexander-akait) in [#20929](https://github.com/webpack/webpack/pull/20929))

- Preserve `@charset` at-rule when CSS modules use `exportType: "text"`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20912](https://github.com/webpack/webpack/pull/20912))

- Resolve `[hash]`/`[fullhash]` placeholders in `output.publicPath` when generating `url()` references for `experiments.css`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20879](https://github.com/webpack/webpack/pull/20879))

- Fix HMR for concatenated CSS modules with `style` exportType by using stable per-module identifiers for injected style elements and tracking inner module IDs of concatenated modules in HMR records (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20911](https://github.com/webpack/webpack/pull/20911))

- Fix CSS Modules `@value` resolution when the same local name is imported from multiple modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#20940](https://github.com/webpack/webpack/pull/20940))

- Fix `typeof ns.default` / `ns.default instanceof X` on a static `import defer * as ns from "./mod"` for `default-only` and `default-with-named` external modules under `optimization.concatenateModules`. The concatenated-module rewrite was collapsing `ns.default` to the deferred-namespace proxy itself instead of routing through the optimized `.a` getter (which lazily evaluates the module and returns its default value), so `typeof ns.default` observed `"object"` (the proxy) rather than the type of the default. The `dynamic` exportsType already used `.a` correctly; default-only and default-with-named now match. (by [@alexander-akait](https://github.com/alexander-akait) in [#20910](https://github.com/webpack/webpack/pull/20910))

- Make `import defer * as ns` more spec-compliant: `ns.x = value` no longer triggers module evaluation (per the TC39 import-defer `[[Set]]` algorithm), and the deferred namespace is now a distinct object from the eager namespace, with the same Deferred Module Namespace Exotic Object shared across defer-import call sites for the same module. (by [@alexander-akait](https://github.com/alexander-akait) in [#20913](https://github.com/webpack/webpack/pull/20913))

- Fixed spec deviations in the deferred namespace object returned by `__webpack_require__.z` (`import defer * as ns` / `import.defer(...)`). (by [@alexander-akait](https://github.com/alexander-akait) in [#20910](https://github.com/webpack/webpack/pull/20910))

- Drop the `__webpack_require__`, `__webpack_require__.d`, and `__webpack_require__.o` runtime helpers from `library: { type: "module" }` bundles when the on-demand exports source they were emitted for ends up dropped (e.g. a single concatenated entry without an IIFE). (by [@alexander-akait](https://github.com/alexander-akait) in [#20901](https://github.com/webpack/webpack/pull/20901))

- Resolve the static specifier of a dynamic `import()` whose argument is a side-effect-free `SequenceExpression`, e.g. `import((1, 0, "./mod.js"))` is now treated the same as `import("./mod.js")` instead of being rejected as unresolvable. (by [@alexander-akait](https://github.com/alexander-akait) in [#20917](https://github.com/webpack/webpack/pull/20917))

- Stable shared module ids and runtime-chunk emission order. (by [@imccausl](https://github.com/imccausl) in [#20860](https://github.com/webpack/webpack/pull/20860))

- Fix snapshot validity check for context dependencies in watch mode by treating watchpack's existence-only entries (`{}`) as cache misses. (by [@alexander-akait](https://github.com/alexander-akait) in [#20916](https://github.com/webpack/webpack/pull/20916))

- Support no-expression template literals in computed member access (e.g. ``import.meta[`url`]``). (by [@alexander-akait](https://github.com/alexander-akait) in [#20889](https://github.com/webpack/webpack/pull/20889))

- Improve tree-shaking in `isPure`: handle more expression types (`ArrayExpression`, `ObjectExpression`, `NewExpression`, `ChainExpression`, `UnaryExpression` (safe operators), `MetaProperty`, `TaggedTemplateExpression`, `BinaryExpression` (strict equality)), prevent `/*#__PURE__*/` comments from leaking across `ObjectExpression` properties, and detect PURE comments inside `TemplateLiteral` interpolations. (by [@alexander-akait](https://github.com/alexander-akait) in [#20723](https://github.com/webpack/webpack/pull/20723))

- Reject `new import.defer(...)` and `new import.source(...)` as a parse-time `SyntaxError`, matching the spec — `ImportCall` is a `CallExpression` and is not a valid operand of `new`. Parenthesized forms (`new (import.defer(...))`) remain valid and continue to throw `TypeError` at runtime as before. (by [@alexander-akait](https://github.com/alexander-akait) in [#20917](https://github.com/webpack/webpack/pull/20917))

- Escape `#` characters that appear inside a path-shaped request's directory portion before passing the request to the resolver, so projects located in directories like `/home/user/proj#1` (and tools like webpack-dev-server that build entry requests with query strings) resolve correctly. The escape only kicks in when the request contains both a `#` in the path portion and a `?` query string — paths without a query keep their existing semantics. (by [@alexander-akait](https://github.com/alexander-akait) in [#20980](https://github.com/webpack/webpack/pull/20980))

- Silence unhandled rejection from the prefetch trigger when chunk loading fails. The `ensureChunkHandlers.prefetch` runtime created `Promise.all(promises).then(...)` whose result is discarded by `__webpack_require__.e`. If chunk loading rejected (e.g. `chunkLoadTimeout`), that dangling chain produced an unhandled rejection. Prefetch is best-effort, so a no-op rejection handler is now attached. (by [@alexander-akait](https://github.com/alexander-akait) in [#20898](https://github.com/webpack/webpack/pull/20898))

- Align `require()` of an ES module with Node.js's [`require(esm)`](https://nodejs.org/docs/latest/api/modules.html#loading-ecmascript-modules-using-require) `"module.exports"` named-export convention. When CommonJS `require()` resolves to an ES module that exports a binding with the literal string name `"module.exports"` (e.g. `export { value as "module.exports" }`), `require()` now returns the value of that export instead of the module's namespace object — matching Node.js v22.12+/v23+ behavior and easing migration of dual ESM/CJS libraries that rely on `module.exports = …`. The unwrap applies to plain `require()`, `require().foo`, calls (`require()(…)`), destructuring, and to CJS wrappers like `module.exports = require(esm)` / `exports.x = require(esm)`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20981](https://github.com/webpack/webpack/pull/20981))

- Remove outdated `@types/eslint-scope` package from dependencies. (by [@alexander-akait](https://github.com/alexander-akait) in [#20869](https://github.com/webpack/webpack/pull/20869))

- Fix `export *` resolution when a star-reexported module re-exports a name back to the importer cyclically. Previously, in a graph where `a` does `export * from "./b"; export * from "./c";` and `b` does `export { foo } from "./a";` while `c` provides the actual `foo` binding, webpack hoisted `foo` from `b` into `a`'s namespace without per-name cycle detection — emitting a getter chain (`a.foo` → `b.foo` → `a.foo`) that threw "Maximum call stack size exceeded" at runtime. The TC39 `ResolveExport` algorithm requires the cyclic branch to return null and the star loop to fall through to the non-cyclic source. (by [@alexander-akait](https://github.com/alexander-akait) in [#20959](https://github.com/webpack/webpack/pull/20959))

- Preserve `using` declaration initializers when the inner graph optimization is enabled. (by [@hai-x](https://github.com/hai-x) in [#20906](https://github.com/webpack/webpack/pull/20906))

- Fixed typescript types. (by [@alexander-akait](https://github.com/alexander-akait) in [#20880](https://github.com/webpack/webpack/pull/20880))

- Bump `webpack-sources` to `^3.4.1` and feed asset bytes into hashes via the new `Source.prototype.buffers()` API. For large `ConcatSource`/`ReplaceSource` outputs this avoids the intermediate `Buffer.concat` that `source.buffer()` performs, removing a peak-memory spike equal to the source's total size on each hashed asset (`AssetGenerator.getFullContentHash`, `CssIcssExportDependency` content hashing, and `RealContentHashPlugin`). A small benchmark on a 64 MiB `ConcatSource` shows ~64 MiB lower peak external memory and ~45% faster hashing. (by [@alexander-akait](https://github.com/alexander-akait) in [#20897](https://github.com/webpack/webpack/pull/20897))

## 5.106.2

### Patch Changes

- CSS @import now inherits the parent module's exportType, so a file configured as "text" correctly creates a style tag when @imported by a "style" parent. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20838](https://github.com/webpack/webpack/pull/20838))

- Make asset modules available in JS context when referenced from both CSS and a lazily compiled JS chunk. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20801](https://github.com/webpack/webpack/pull/20801))

- Include missing generator options in hash to ensure persistent cache invalidation when configuration changes (CssGenerator `exportsOnly`, JsonGenerator `JSONParse`, WebAssemblyGenerator `mangleImports`). (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20821](https://github.com/webpack/webpack/pull/20821))

- Fix `||` default value handling in ProgressPlugin and ManifestPlugin that incorrectly overrode user-provided falsy values (e.g. `modules: false`, `entries: false`, `entrypoints: false`). (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20823](https://github.com/webpack/webpack/pull/20823))

- Migrate from `mime-types` to `mime-db`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20812](https://github.com/webpack/webpack/pull/20812))

- Handle `@charset` at-rules in CSS modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#20831](https://github.com/webpack/webpack/pull/20831))

- Marked all experimental options in types. (by [@alexander-akait](https://github.com/alexander-akait) in [#20814](https://github.com/webpack/webpack/pull/20814))

## 5.106.1

### Patch Changes

- Fix two ES5-environment regressions in the anonymous default export `.name` fix-up: the generated code referenced an undeclared `__WEBPACK_DEFAULT_EXPORT__` binding causing `ReferenceError`, and used `Reflect.defineProperty` which is not available in pre-ES2015 runtimes. The fix-up now references the real assignment target and uses `Object.defineProperty` / `Object.getOwnPropertyDescriptor`. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20796](https://github.com/webpack/webpack/pull/20796))

- Prevent `!important` from being renamed as a local identifier in CSS modules. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20798](https://github.com/webpack/webpack/pull/20798))

- Use compiler context instead of module context for CSS modules local ident hashing to avoid hash collisions when files with the same name exist in different directories. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20799](https://github.com/webpack/webpack/pull/20799))

## 5.106.0

### Minor Changes

- Add `exportType: "style"` for CSS modules to inject styles into DOM via HTMLStyleElement, similar to style-loader functionality. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20579](https://github.com/webpack/webpack/pull/20579))

- Add `context` option support for VirtualUrlPlugin (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20449](https://github.com/webpack/webpack/pull/20449))
  - The context for the virtual module. A string path. Defaults to 'auto', which will try to resolve the context from the module id.
  - Support custom context path for resolving relative imports in virtual modules
  - Add examples demonstrating context usage and filename customization

- Generate different `CssModule` instances for different `exportType` values. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20590](https://github.com/webpack/webpack/pull/20590))

- Added the `localIdentHashFunction` option to configure the hash function to be used for hashing. (by [@alexander-akait](https://github.com/alexander-akait) in [#20694](https://github.com/webpack/webpack/pull/20694))
  Additionally, the `localIdentName` option can now be a function.

- Added support for destructuring assignment `require` in cjs, allowing for tree shaking. (by [@ahabhgk](https://github.com/ahabhgk) in [#20548](https://github.com/webpack/webpack/pull/20548))

- Added the `validate` option to enable/disable validation in webpack/plugins/loaders, also implemented API to make it inside plugins. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20275](https://github.com/webpack/webpack/pull/20275))

- Added `source` support for async WASM modules. (by [@magic-akari](https://github.com/magic-akari) in [#20364](https://github.com/webpack/webpack/pull/20364))

### Patch Changes

- Add a static getSourceBasicTypes method to the Module class to prevent errors across multiple versions. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20614](https://github.com/webpack/webpack/pull/20614))

- Included fragment groups in the conflicting order warning for CSS. (by [@aryanraj45](https://github.com/aryanraj45) in [#20660](https://github.com/webpack/webpack/pull/20660))

- Avoid rendering unused top-level `__webpack_exports__` declaration when output ECMA module library. (by [@hai-x](https://github.com/hai-x) in [#20669](https://github.com/webpack/webpack/pull/20669))

- Fixed resolving in CSS modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#20771](https://github.com/webpack/webpack/pull/20771))

- Allow external modules place in async chunks when output ECMA module. (by [@hai-x](https://github.com/hai-x) in [#20662](https://github.com/webpack/webpack/pull/20662))

- Implement `deprecate` flag in schema for better TypeScript support to show which options are already deprecated by the configuration (by [@bjohansebas](https://github.com/bjohansebas) in [#20432](https://github.com/webpack/webpack/pull/20432))

- Set `.name` to `"default"` for anonymous default export functions and classes per ES spec (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20773](https://github.com/webpack/webpack/pull/20773))

- Hash entry chunks after runtime chunks to prevent stale content hash references in watch mode (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20724](https://github.com/webpack/webpack/pull/20724))

- Fix multiple bugs and optimizations in CSS modules: correct third code point position in walkCssTokens number detection, fix multiline CSS comment regex, fix swapped :import/:export error message, fix comma callback incorrectly popping balanced stack, fix cache comparison missing array length check, fix match.index mutation side effect, move publicPathAutoRegex to module scope, precompute merged callbacks in consumeUntil, simplify redundant ternary in CssGenerator, fix typo GRID_TEMPLATE_ARES, remove duplicate grid-column-start, and merge duplicate getCompilationHooks calls. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20648](https://github.com/webpack/webpack/pull/20648))

- Correct url() path resolution and preserve source maps for non-link CSS export types (style, text, css-style-sheet) (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20717](https://github.com/webpack/webpack/pull/20717))

- Emit error when proxy server returns non-200 status code in HttpUriPlugin instead of silently failing. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20646](https://github.com/webpack/webpack/pull/20646))

- `import.meta` as standalone expression now returns a complete object with known properties (`url`, `webpack`, `main`, `env`) instead of an empty object `({})`, and hoists it as a module-level variable to ensure `import.meta === import.meta` identity. In `preserve-unknown` mode (ESM output), the hoisted object merges runtime `import.meta` properties via `Object.assign`. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20658](https://github.com/webpack/webpack/pull/20658))

- Fix incorrect condition in FileSystemInfo that always evaluated to false, preventing trailing slash removal from directory paths during build dependency resolution. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20649](https://github.com/webpack/webpack/pull/20649))

- fix: VirtualUrlPlugin absolute path virtual module IDs getting concatenated with compiler context (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20656](https://github.com/webpack/webpack/pull/20656))

  When a virtual module ID is an absolute path (e.g. `virtual:C:/project/user.js`), the auto-derived context was incorrectly joined with `compiler.context`, producing a concatenated path like `C:\cwd\C:\project`. Now absolute-path contexts are used directly.

- All deprecated methods and options now have `@deprecated` flag in types. (by [@alexander-akait](https://github.com/alexander-akait) in [#20707](https://github.com/webpack/webpack/pull/20707))

- Fix `CompatibilityPlugin` to correctly rename `__webpack_require__` when it appears as an arrow function parameter (e.g. `(__webpack_module, __webpack_exports, __webpack_require__) => { ... }`). (by [@hai-x](https://github.com/hai-x) in [#20661](https://github.com/webpack/webpack/pull/20661))

## 5.105.4

### Patch Changes

- Add `Module.getSourceBasicTypes` to distinguish basic source types and clarify how modules with non-basic source types like `remote` still produce JavaScript output. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20546](https://github.com/webpack/webpack/pull/20546))

- Handle `createRequire` in expressions. (by [@alexander-akait](https://github.com/alexander-akait) in [#20549](https://github.com/webpack/webpack/pull/20549))

- Fixed types for multi stats. (by [@alexander-akait](https://github.com/alexander-akait) in [#20556](https://github.com/webpack/webpack/pull/20556))

- Remove empty needless js output for normal css module. (by [@JSerFeng](https://github.com/JSerFeng) in [#20162](https://github.com/webpack/webpack/pull/20162))

- Update `enhanced-resolve` to support new features for `tsconfig.json`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20555](https://github.com/webpack/webpack/pull/20555))

- Narrows export presence guard detection to explicit existence checks on namespace imports only, i.e. patterns like "x" in ns. (by [@hai-x](https://github.com/hai-x) in [#20561](https://github.com/webpack/webpack/pull/20561))

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
