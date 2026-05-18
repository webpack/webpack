# webpack

## 5.107.0

### Minor Changes

- Add `module.generator.javascript.anonymousDefaultExportName` option to control whether webpack sets `.name` to `"default"` for anonymous default export functions and classes per ES spec. Defaults to `true` for applications and `false` for libraries (when `output.library` is set) to avoid unnecessary bundle size overhead. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20894](https://github.com/webpack/webpack/pull/20894))

- Support module concatenation (scope hoisting) for CSS modules with `text`, `css-style-sheet`, `style`, and `link` export types (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20851](https://github.com/webpack/webpack/pull/20851))

- The `generator.exportsConvention` function form for CSS modules now accepts `string[]` in addition to `string`. Returning an array exports the local under every name in the array, matching `css-loader`'s behaviour and letting consumers expose multiple aliases (e.g. `[name, name.toUpperCase()]`) for a single class. (by [@alexander-akait](https://github.com/alexander-akait) in [#20914](https://github.com/webpack/webpack/pull/20914))

- Add `linkInsert` hook to `CssLoadingRuntimeModule.getCompilationHooks(compilation)` so plugin developers can control where stylesheet `<link>` elements are inserted into the document. The hook receives the default insertion source (`document.head.appendChild(link);`) and the chunk, and returns the JS used to attach the link. (by [@alexander-akait](https://github.com/alexander-akait) in [#20947](https://github.com/webpack/webpack/pull/20947))

- Add a `pure` parser option for `css/module` and `css/auto` types matching `postcss-modules-local-by-default`'s pure mode: every selector must contain at least one local class or id, otherwise webpack emits a build error. Two comments opt out — `/* cssmodules-pure-ignore */` directly before a rule suppresses that rule's check (per-rule, not propagated to children, matching PCSL), and `/* cssmodules-pure-no-check */` placed among the leading comments of the file (before any rule) disables the check for the whole file. Nested rules inside a local-bearing ancestor are treated as pure-compliant; `&` resolves to the parent rule's purity; `@keyframes` and `@counter-style` body contents are exempt; rules whose body contains only nested rules don't trigger the check (the children carry it instead). (by [@alexander-akait](https://github.com/alexander-akait) in [#20946](https://github.com/webpack/webpack/pull/20946))

- Support CSS Modules `@value` identifiers as `@import` URLs and inside `url()` functions, e.g. `@value path: "./other.css"; @import path;` and `@value bg: "./image.png"; .a { background: url(bg); }` (by [@alexander-akait](https://github.com/alexander-akait) in [#20925](https://github.com/webpack/webpack/pull/20925))

- Add experimental TypeScript support via `experiments.typescript: true` (auto-enabled by `experiments.futureDefaults`). Uses Node.js's built-in `module.stripTypeScriptTypes` (Node.js >= 22.6 with the stable `mode: "strip"` API, including Node.js 26) to transform `.ts`, `.cts`, `.mts`, `data:text/typescript`, and `data:application/typescript` modules — no type checking, only erasable TypeScript (types, generics, `import type`, casts). `.tsx`/JSX and non-erasable syntax (`enum`, `namespace`, parameter-property constructors, decorator metadata) are NOT supported; use a TSX-capable loader (e.g. `ts-loader`, `swc-loader`) for those. (by [@alexander-akait](https://github.com/alexander-akait) in [#20964](https://github.com/webpack/webpack/pull/20964))

  Adds matching default rules, extension resolution (`.ts` is resolved before `.js`), `extensionAlias` for `.js`/`.cjs`/`.mjs` to also try `.ts`/`.cts`/`.mts`, `tsconfig` resolution, and the `"typescript"` conditional-exports key so monorepo packages can ship `.ts` sources via `package.json#exports` (matching Node.js's amaro convention).

- Added an `experiments.html` flag that reserves the `html` module type for the first-class HTML entry-point support. (by [@aryanraj45](https://github.com/aryanraj45) in [#20902](https://github.com/webpack/webpack/pull/20902))

- Preserve `defer` / `source` import phase keywords on external dependencies in ESM output, the same way import attributes are preserved. Static `import defer * as ns from "x"` and `import source v from "x"` against a `module` external are now emitted as native `import defer * as …` / `import source … from …` statements at the top of the bundle, and dynamic `import.defer("x")` / `import.source("x")` against an `import` external is emitted as `import.defer(…)` / `import.source(…)`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20934](https://github.com/webpack/webpack/pull/20934))

- Support the `#__NO_SIDE_EFFECTS__` annotation to mark functions as pure for better tree-shaking. (by [@hai-x](https://github.com/hai-x) in [#20775](https://github.com/webpack/webpack/pull/20775))

- Add support for inline `<script>` tags in HTML modules. The tag's JS body is bundled as its own entry chunk — through the same pipeline that already processes `<script src>` — and the inline body is replaced with a `src` attribute pointing at the emitted chunk. Inline `<script type="module">` is bundled as an ESM entry; classic inline `<script>` is bundled as a CommonJS entry. `<script>` is treated as rawtext so a `<` inside the JS body (e.g. in a string literal) no longer breaks HTML parsing. Non-JS `type` values (e.g. `application/ld+json`, `importmap`) pass through unchanged. (by [@alexander-akait](https://github.com/alexander-akait) in [#20967](https://github.com/webpack/webpack/pull/20967))

  The rewritten `<script>` tag's `type` attribute is reconciled with the emitted chunk's actual format, for both inline `<script>` and external `<script src>`: when `output.module` is on, classic scripts get `type="module"` auto-inserted so the ES-module chunk loads correctly; when `output.module` is off, `type="module"` is dropped so the classic IIFE chunk isn't loaded under module semantics.

- Add support for inline `<style>` tags in HTML modules. The tag's CSS body is routed through webpack's CSS pipeline as a virtual CSS module with `exportType: "text"`, so `url()` and `@import` references are resolved relative to the HTML file and the processed CSS text is written back into the original `<style>` tag. `<style type="text/css">` (and `<style>` with no `type`) are processed; non-CSS `type` values are passed through unchanged. (by [@alexander-akait](https://github.com/alexander-akait) in [#20962](https://github.com/webpack/webpack/pull/20962))

- Add support for `<script src>` and `<link rel="modulepreload">` in HTML modules. (by [@alexander-akait](https://github.com/alexander-akait) in [#20949](https://github.com/webpack/webpack/pull/20949))

- Support the `webpackIgnore: true` magic comment in HTML modules. Placing `<!-- webpackIgnore: true -->` immediately before a tag tells webpack not to resolve any of that tag's `src`/`href`/`srcset`/… URLs and leave them untouched in the output, matching the behavior already provided by `html-loader`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20950](https://github.com/webpack/webpack/pull/20950))

- Add `"module-sync"` to default `conditionNames` for resolver defaults to align with Node.js, which exposes the `module-sync` community condition for synchronously-loadable ESM. Affects ESM, CJS, AMD, worker, wasm and build-dependency resolvers. (by [@alexander-akait](https://github.com/alexander-akait) in [#20933](https://github.com/webpack/webpack/pull/20933))

### Patch Changes

- Extract anonymous default export `.name` fix-up into a shared runtime helper (`__webpack_require__.dn`), replacing repeated inline `Object.defineProperty` / `Object.getOwnPropertyDescriptor` calls with a single short call per module to reduce output size. (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20883](https://github.com/webpack/webpack/pull/20883))

- Fix CSS modules `composes` so `composes: foo from "./self.module.css"` from inside `self.module.css` no longer creates a duplicate module instance. Previously the import dependency forced a second `css/module` instance of the same file, emitting the file's CSS twice with two different `localIdent` hashes and producing duplicated entries in the JS class-name export. Self-targeting requests are now collapsed to a self-reference, matching css-loader's output. (by [@alexander-akait](https://github.com/alexander-akait) in [#20929](https://github.com/webpack/webpack/pull/20929))

- Fix CSS modules `composes` parsing so `local()` and `global()` function wrappers are tracked per class name. Previously, `composes: a global(b) local(c)` (or any mix within a single comma-separated group) treated every class with the same scope as the last function-wrapped token, so `b` was incorrectly resolved as a local self-reference. (by [@alexander-akait](https://github.com/alexander-akait) in [#20924](https://github.com/webpack/webpack/pull/20924))

- Fix CSS modules `composes: ... from "<file>"` so the composed files load in an order consistent with every rule's local composes order, instead of source first-appearance order. Previously, if `.a { composes: c from "./c"; }` appeared before `.b { composes: b from "./b"; composes: c from "./c"; }`, `c.css` would be bundled before `b.css` even though `.b`'s local order requires `b` to load earlier so `c` can override it in the cascade. The CSS parser now builds a per-rule composes-from-file graph during parsing and, at end of parse, tags each file's first composes-import dependency with a `sourceOrder` according to a topological sort (Kahn's algorithm, source-order tie-breaking). `NormalModule#build`'s existing `sortWithSourceOrder` pass then reorders the deps for free. Files participating in a cycle (e.g. two rules disagreeing on the relative order of two files) keep their natural source-loc position. Matches the behavior of [`postcss-modules-extract-imports#138`](https://github.com/css-modules/postcss-modules-extract-imports/pull/138) used by `css-loader`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20948](https://github.com/webpack/webpack/pull/20948))

- Avoid emitting the `__webpack_require__` runtime in CSS bundles when all imported CSS modules were concatenated into the same scope. (by [@alexander-akait](https://github.com/alexander-akait) in [#20936](https://github.com/webpack/webpack/pull/20936))

- Recompute the CSS chunk's `[contenthash]` and the rendered CSS bytes when an asset referenced by `url()`/`src()`/string in CSS changes its hashed filename. (by [@alexander-akait](https://github.com/alexander-akait) in [#20938](https://github.com/webpack/webpack/pull/20938))

  Previously, the CSS module's hash only reflected the original request (e.g. `./logo.png`), so a content-only change to a referenced asset left the CSS chunk's `[contenthash]` and code-generated source unchanged. The emitted CSS file then either kept its old name with a stale URL inside, or got served from cache while the real asset filename had moved — both modes break long-term caching. `CssUrlDependency.updateHash` now folds the asset module's build hash into the CSS module's hash, and `AssetGenerator.generate` no longer lets a previous build's persisted `data.url` entry shadow the freshly computed URL.

- Embed an inline `sourceMappingURL` data URI inside the CSS when the `parser.exportType` option are `text`, `style`, or `css-style-sheet`. (by [@alexander-akait](https://github.com/alexander-akait) in [#20886](https://github.com/webpack/webpack/pull/20886))

- Cache CSS ICSS `:export` / `@value` / `composes` reference resolution via `moduleGraph.cached`. Resolving references previously walked each parent module's full dependency list on every lookup; now per-module indices of `CssIcssImportDependency` (by local name) and `CssIcssExportDependency` (by export name) are built once per build and the top-level `resolve`/`resolveReferences` results are memoized for repeated lookups during code generation. `getLocalIdent` is also memoized per `(module, local)` so its hashing work is not repeated when the same identifier is interpolated more than once. Cycle semantics are unchanged: recursive calls pass `seen` and bypass the cache, so only completed top-level resolutions are memoized. (by [@alexander-akait](https://github.com/alexander-akait) in [#20960](https://github.com/webpack/webpack/pull/20960))

- Fix three correctness gaps in CSS ICSS dependencies (`CssIcssExportDependency`, `CssIcssImportDependency`): (by [@alexander-akait](https://github.com/alexander-akait) in [#20957](https://github.com/webpack/webpack/pull/20957))
  1. **No more spurious "name not found" warnings under `camel-case-only` / `dashes-only`.** Both `CssIcssExportDependency.getWarnings` (for `composes: foo-bar;`) and `CssIcssImportDependency.getWarnings` (for `composes: foo-bar from "./other.css";`) compared the raw composed/imported name against `ExportsInfo`, which only stores names produced by `exportsConvention`. With `camel-case-only` the class `.foo-bar` is exported as `fooBar`, so the lookup would fail and a "Self-referencing name … not found" / "Referenced name … not found" warning would be emitted even though the class exists. Both checks now expand the looked-up name through the relevant module's `exportsConvention` and pass if any alias is provided.
  2. **`CssIcssExportDependency.updateHash` now hashes the dep's `value`, `range`, `interpolate`, `exportMode`, and `exportType`** in addition to `name`'s convention-derived aliases and `localIdentName`. Previously two instances with the same `name` but different `value` / mode / type produced the same hash, so switching e.g. `composes: foo` → `composes: bar` or `ONCE` → `APPEND` would not invalidate the module's persistent cache. `CssIcssSymbolDependency.updateHash` gets explicit field separators for the same reason (avoid adjacent-field aliasing).
  3. **`CssIcssExportDependency.getReferencedExports` for `SELF_REFERENCE`** now returns the composed class (`this.value`) instead of the exporting class (`this.name`), and applies the generator's `exportsConvention` so the optimizer sees the export names actually stored under that convention.

  The convention expansion of `this.value` / `this.importName` is memoized per dep (`getValueConventionNames` on `CssIcssExportDependency`, `getImportNameConventionNames` on `CssIcssImportDependency`) — the parent (or target) module is fixed for a given dep, so its `exportsConvention` is fixed, so each dep only ever pays `cssExportConvention` once and reuses the result across `getReferencedExports`, `getWarnings`, and `Template.getIdentifier` (which runs every code-gen). Big CSS-Modules-heavy projects will notice this most.

- Move `escapeIdentifier` / `unescapeIdentifier` from `CssParser` to `walkCssTokens` and cache their results per-compilation, similar to `makePathsRelative`. The functions remain re-exported from `CssParser` for backwards compatibility. CSS files commonly reuse the same identifiers (class names, custom properties, keyframes) many times, so caching avoids repeated work during parsing and code generation. (by [@alexander-akait](https://github.com/alexander-akait) in [#20952](https://github.com/webpack/webpack/pull/20952))

- Merge `@import`ed CSS at build time for `text` and `css-style-sheet` exportTypes so the bundle ships a single accurate inline source map covering every contributing file. Previously each module's JS literal carried its own inline map and the imports were stitched together at runtime — DevTools only saw the parent's map (with mappings off by the prepended import content) and for `css-style-sheet` the maps were stripped entirely by `replaceSync`. The `cssMergeStyleSheets` runtime helper is no longer needed and has been removed. (by [@alexander-akait](https://github.com/alexander-akait) in [#20954](https://github.com/webpack/webpack/pull/20954))

- Map each generated CSS-module class export line in the JS bundle back to its selector position in the original CSS file (e.g. `btn: "..."` → `.btn { ... }`), rather than only embedding the generated wrapper as `sourcesContent`. Brings JS source-map fidelity for the built-in CSS feature in line with what `css-loader` produces. (by [@alexander-akait](https://github.com/alexander-akait) in [#20909](https://github.com/webpack/webpack/pull/20909))

- Wrap the JS emit of CSS modules with `exportType: "link"` (the default) in an `OriginalSource` so the bundle's JS source map maps the generated `module.exports = { className: "hash" }` lines back to the CSS module's identifier, matching the behaviour of other CSS export types. (by [@alexander-akait](https://github.com/alexander-akait) in [#20909](https://github.com/webpack/webpack/pull/20909))

- Fix CSS modules deduplication so a `.module.<ext>` file imported both directly (JS) and via icss (`composes from` / `:import`) becomes a single module instance. Previously the default rule on `dependency: /css-import-(local|global)-module/` forced the icss-imported instance to type `css/module` even for `.module.css` files that the auto rule already classified as modules — producing two module instances of the same file with different `localIdent` hashes, duplicated CSS output, and chained class names in the JS export. The dependency rule now `exclude`s `.module.<ext>`, matching css-loader's single-instance output. (by [@alexander-akait](https://github.com/alexander-akait) in [#20929](https://github.com/webpack/webpack/pull/20929))

  Note: as a side effect, parser options configured under `module.parser["css/auto"]` (e.g. `dashedIdents: false`) now also apply to `.module.<ext>` files reached via icss-import, where they were previously silently overridden by the forced `css/module` type. To opt back into the old behavior for icss-imported files, configure the same parser options under `module.parser["css/module"]` as well.

- Preserve `@charset` at-rule when CSS modules use `exportType: "text"`. The charset is prepended at build time, walking through text imports to handle the transitive case where a module has no local `@charset` but inherits one from an imported text module. When a text module imports another text module, the import's `@charset` prefix is sliced off using a build-time-computed length so the final output contains a single `@charset` directive at byte 0. (by [@alexander-akait](https://github.com/alexander-akait) in [#20912](https://github.com/webpack/webpack/pull/20912))

- Resolve `[hash]`/`[fullhash]` placeholders in `output.publicPath` (including function publicPaths that reference `pathData.hash`) when generating `url()` references for `experiments.css`. Previously these produced broken URLs containing `undefined` or an un-substituted `[hash]` placeholder because the compilation hash was not yet available at code generation time. (by [@alexander-akait](https://github.com/alexander-akait) in [#20879](https://github.com/webpack/webpack/pull/20879))

- Fix HMR for concatenated CSS modules with `style` exportType by using stable per-module identifiers for injected style elements and tracking inner module IDs of concatenated modules in HMR records (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20911](https://github.com/webpack/webpack/pull/20911))

- Fix CSS Modules `@value` resolution when the same local name is imported from multiple modules. Each reference now resolves through the `@value` import that was active at its source position, instead of always picking the first one. (by [@alexander-akait](https://github.com/alexander-akait) in [#20940](https://github.com/webpack/webpack/pull/20940))

- Fix `typeof ns.default` / `ns.default instanceof X` on a static `import defer * as ns from "./mod"` for `default-only` and `default-with-named` external modules under `optimization.concatenateModules`. The concatenated-module rewrite was collapsing `ns.default` to the deferred-namespace proxy itself instead of routing through the optimized `.a` getter (which lazily evaluates the module and returns its default value), so `typeof ns.default` observed `"object"` (the proxy) rather than the type of the default. The `dynamic` exportsType already used `.a` correctly; default-only and default-with-named now match. (by [@alexander-akait](https://github.com/alexander-akait) in [#20910](https://github.com/webpack/webpack/pull/20910))

- Make `import defer * as ns` more spec-compliant: `ns.x = value` no longer triggers module evaluation (per the TC39 import-defer `[[Set]]` algorithm), and the deferred namespace is now a distinct object from the eager namespace, with the same Deferred Module Namespace Exotic Object shared across defer-import call sites for the same module. (by [@alexander-akait](https://github.com/alexander-akait) in [#20913](https://github.com/webpack/webpack/pull/20913))

- Fix several spec deviations in the deferred namespace object returned by `__webpack_require__.z` (`import defer * as ns` / `import.defer(...)`): (by [@alexander-akait](https://github.com/alexander-akait) in [#20910](https://github.com/webpack/webpack/pull/20910))
  - **Proxy invariant violations.** Structural introspection (`Object.keys`, `Object.getOwnPropertyNames`, `Object.getOwnPropertyDescriptor`) on a deferred namespace previously threw `'getOwnPropertyDescriptor' on proxy: trap reported non-configurability for property '<name>' which is either non-existent or configurable in the proxy target` because the proxy target stayed empty while the trap returned non-configurable descriptors from the resolved namespace. The trap now mirrors the resolved namespace's own properties onto a dedicated target object after evaluation, and pre-populates `__esModule` / `Symbol.toStringTag` (with non-configurable, non-writable, non-enumerable descriptors per the TC39 import-defer spec for Module Namespace Exotic Objects) so pre-evaluation introspection is also invariant-compliant. The `Symbol.toStringTag` value (`"Deferred Module"`) is preserved from the proposal.
  - **Symbol-keyed accesses no longer trigger evaluation.** Per `IsSymbolLikeNamespaceKey` in the TC39 import-defer spec, `[[Get]]` / `[[Has]]` / `[[GetOwnProperty]]` for a Symbol key (and for `"then"` on a deferred namespace) must go through `OrdinaryGet…` without triggering evaluation of the deferred module. The proxy traps now short-circuit for those cases. `[[DefineOwnProperty]]` and `[[Delete]]` short-circuit for symbol-like keys but continue to trigger evaluation for string keys (matching the spec, which calls `[[GetOwnProperty]]` / `GetModuleExportsList` for non-symbol-like keys). `[[Set]]` always returns false without triggering evaluation, matching the spec algorithm.

  These changes unblock 19 previously-skipped test262 cases under `language/import/import-defer/` (and the two configCases-side bugs that surfaced them — `Object.getOwnPropertyNames` on the deferred namespace, and `typeof ns.default` for default-only/default-with-named external deferred imports under `concatenateModules`).

- Drop the `__webpack_require__`, `__webpack_require__.d`, and `__webpack_require__.o` runtime helpers from `library: { type: "module" }` bundles when the on-demand exports source they were emitted for ends up dropped (e.g. a single concatenated entry without an IIFE). (by [@alexander-akait](https://github.com/alexander-akait) in [#20901](https://github.com/webpack/webpack/pull/20901))

- Resolve the static specifier of a dynamic `import()` whose argument is a side-effect-free `SequenceExpression`, e.g. `import((1, 0, "./mod.js"))` is now treated the same as `import("./mod.js")` instead of being rejected as unresolvable. (by [@alexander-akait](https://github.com/alexander-akait) in [#20917](https://github.com/webpack/webpack/pull/20917))

- Stable shared module ids and runtime-chunk emission order. (by [@imccausl](https://github.com/imccausl) in [#20860](https://github.com/webpack/webpack/pull/20860))

- Fix snapshot validity check for context dependencies in watch mode by treating watchpack's existence-only entries (`{}`) as cache misses. `addFileTimestamps` and `addContextTimestamps` accept these entries, but the cache types previously claimed everything was a fully-populated entry, so subsequent snapshot comparisons (and `getFileTimestamp`/`getContextTimestamp`) treated `{}` as a real timestamp and falsely invalidated snapshots — most visibly causing loaders that call `addContextDependency` to rerun once after the first change. The cache types now include `ExistenceOnlyTimeEntry`, and every cache lookup falls back to a fresh on-disk read when the cached entry is existence-only or lacks a `timestampHash` the snapshot expects. (by [@alexander-akait](https://github.com/alexander-akait) in [#20916](https://github.com/webpack/webpack/pull/20916))

- Support no-expression template literals in computed member access (e.g. ``import.meta[`url`]``). (by [@alexander-akait](https://github.com/alexander-akait) in [#20889](https://github.com/webpack/webpack/pull/20889))

- Improve tree-shaking in `isPure`: handle more expression types (`ArrayExpression`, `ObjectExpression`, `NewExpression`, `ChainExpression`, `UnaryExpression` (safe operators), `MetaProperty`, `TaggedTemplateExpression`, `BinaryExpression` (strict equality)), prevent `/*#__PURE__*/` comments from leaking across `ObjectExpression` properties, and detect PURE comments inside `TemplateLiteral` interpolations. (by [@alexander-akait](https://github.com/alexander-akait) in [#20723](https://github.com/webpack/webpack/pull/20723))

- Reject `new import.defer(...)` and `new import.source(...)` as a parse-time `SyntaxError`, matching the spec — `ImportCall` is a `CallExpression` and is not a valid operand of `new`. Parenthesized forms (`new (import.defer(...))`) remain valid and continue to throw `TypeError` at runtime as before. (by [@alexander-akait](https://github.com/alexander-akait) in [#20917](https://github.com/webpack/webpack/pull/20917))

- Silence unhandled rejection from the prefetch trigger when chunk loading fails. The `ensureChunkHandlers.prefetch` runtime created `Promise.all(promises).then(...)` whose result is discarded by `__webpack_require__.e`. If chunk loading rejected (e.g. `chunkLoadTimeout`), that dangling chain produced an unhandled rejection. Prefetch is best-effort, so a no-op rejection handler is now attached. (by [@alexander-akait](https://github.com/alexander-akait) in [#20898](https://github.com/webpack/webpack/pull/20898))

- Refactor CssGenerator: rename `_cssSourceToJsStringLiteral` to `_cssToJsLiteral` and remove unused parameters, hoist shared variables to eliminate duplicate declarations, flatten nested source map wrapping logic, and extract repeated type annotations into typedefs (by [@xiaoxiaojx](https://github.com/xiaoxiaojx) in [#20922](https://github.com/webpack/webpack/pull/20922))

- Rename CSS-prefixed identifiers to use `Css` for consistency with the rest of the CSS-related naming (`CssParser`, `CssGenerator`, `CssModule`, `cssData`, …): `buildMeta.isCSSModule` → `buildMeta.isCssModule`, typedef `CSSModuleTypes` → `CssModuleTypes`, typedef `CSSModuleCreateData` → `CssModuleCreateData` (by [@alexander-akait](https://github.com/alexander-akait) in [#20926](https://github.com/webpack/webpack/pull/20926))

- Remove outdated `@types/eslint-scope` package from dependencies. (by [@alexander-akait](https://github.com/alexander-akait) in [#20869](https://github.com/webpack/webpack/pull/20869))

- Fix `export *` resolution when a star-reexported module re-exports a name back to the importer cyclically. Previously, in a graph where `a` does `export * from "./b"; export * from "./c";` and `b` does `export { foo } from "./a";` while `c` provides the actual `foo` binding, webpack hoisted `foo` from `b` into `a`'s namespace without per-name cycle detection — emitting a getter chain (`a.foo` → `b.foo` → `a.foo`) that threw "Maximum call stack size exceeded" at runtime. The TC39 `ResolveExport` algorithm requires the cyclic branch to return null and the star loop to fall through to the non-cyclic source. Webpack's `HarmonyExportImportedSpecifierDependency` now detects when a candidate star-export contribution's target chain loops back to the importer under the same name and skips it, letting the sibling `export *` provide the binding. (by [@alexander-akait](https://github.com/alexander-akait) in [#20959](https://github.com/webpack/webpack/pull/20959))

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
