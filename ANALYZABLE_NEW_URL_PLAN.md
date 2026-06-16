# Plan: Analyzable `new URL(…, import.meta.url)` output

First slice of the larger "make webpack's ECMAScript output analyzable by webpack
itself and other bundlers (rollup, esbuild, and others)" effort. Scope is intentionally
narrow: only the `new URL("./asset", import.meta.url)` asset-reference pattern.

## 1. Problem

Source:

```text
const u = new URL("./asset.png", import.meta.url);
```

What webpack emits today (`lib/dependencies/URLDependency.js:110-162`):

```text
// non-relative (default)
const u = new URL(/* asset import */ __webpack_require__(/*id*/ 123), __webpack_require__.b);
// url: "relative"
const u = new /* asset import */ __webpack_require__.U(__webpack_require__(/*id*/ 123));
```

and the referenced asset module exports (`lib/asset/AssetGenerator.js:393-399, 645-660`):

```text
module.exports = __webpack_require__.p + "asset.<hash>.png";
```

This is **not statically analyzable** by other tools because:

1. `import.meta.url` is gone — replaced by `__webpack_require__.b`
   (`RuntimeGlobals.baseURI`, set at runtime in `lib/runtime/BaseUriRuntimeModule.js`).
2. The asset reference goes through `__webpack_require__(id)` (dynamic dispatch into
   the module map) instead of a literal specifier.
3. The asset URL is built from `__webpack_require__.p` (publicPath runtime global) at
   runtime.

The canonical, universally-recognized analyzable form is the **source form itself**:

```text
const u = new URL("./asset.<hash>.png", import.meta.url);
```

webpack, rollup, and esbuild all statically detect `new URL(<string literal>, import.meta.url)`.
Goal: emit exactly that when the output is a real ESM module.

## 2. Preconditions / when this mode is active

**Decision: default-on for `output.module`.** No experiment flag — whenever the output
is a real ESM module, emit the analyzable form. This makes ESM output strictly more
standard for everyone.

Emit the analyzable form only when **all** hold (otherwise keep current behavior):

- `output.module === true` and `environment.module === true` — `import.meta.url` is
  only valid in real ESM output (`RuntimeTemplate.isModule()`,
  `lib/RuntimeTemplate.js:119`, and `supportsEcmaScriptModuleSyntax()` at `:170`).
- The asset specifier is statically resolvable to a literal (already required — parser
  evaluates arg1, `lib/url/URLParserPlugin.js:86`).
- publicPath is statically known: `"auto"` (relative to module) **or** a literal string.
  A runtime/dynamic publicPath falls back to the existing form.

CommonJS / IIFE output is untouched (no `import.meta.url` available), so the default
registry runtime stays exactly as-is for non-module builds.

## 3. The output we want, per publicPath

Let `assetFile` = asset's output filename, `chunkDir` = output dir of the chunk that
contains the consuming JS module.

| publicPath         | emitted specifier                          | resulting `new URL`                                        |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------- |
| `"auto"`           | path of `assetFile` relative to `chunkDir` | `new URL("./asset.<hash>.png", import.meta.url)`           |
| literal string `P` | `JSON.stringify(P + assetFile)`            | `new URL("https://cdn/asset.<hash>.png", import.meta.url)` |
| runtime/dynamic    | —                                          | fall back to current `__webpack_require__.b` form          |

In all analyzable cases the second argument stays the literal `import.meta.url`.
(For an absolute-URL first arg the base is ignored, but we keep `import.meta.url` so the
expression remains the recognized pattern.)

## Step-by-step implementation

### Step 0 — Test harness first (bug-fix discipline)

- [ ] Add a `configCases` case (e.g. `test/configCases/asset-modules/url-module-analyzable/`)
      with `output.module: true`, `experiments.outputModule: true`, and
      `publicPath: "auto"`. Source does `new URL("./file.png", import.meta.url)`.
- [ ] Assertion reads the emitted bundle text and asserts it contains the literal
      `new URL("./file.<hash>.png", import.meta.url)` and does **not** contain
      `__webpack_require__.b` / `__webpack_require__(` for that reference.
- [ ] Run it, confirm it FAILS against current code. This pins the target.

### Step 1 — Surface "analyzable ESM URL" capability to the template layer

- [ ] Add a helper on `RuntimeTemplate` (e.g. `supportsAnalyzableEsmUrl()`) at
      `lib/RuntimeTemplate.js` returning `isModule() && supportsEcmaScriptModuleSyntax()`.
      Keep it a cheap boolean read (hot-path conscious — no allocation).
- [ ] No new config option — gating is purely `output.module` + `environment.module`,
      both already on `outputOptions` which `RuntimeTemplate` holds.

### Step 2 — Compute the literal asset specifier

- [ ] In `URLDependency.Template.apply` (`lib/dependencies/URLDependency.js:110`), when
      the Step-1 helper is true, resolve the referenced asset module via `moduleGraph`
      and obtain its output filename.
- [ ] Get the asset filename. Source of truth: the asset module's generated filename
      (AssetGenerator computes it from `getAssetPath`/`module.buildInfo`); confirm where
      it is retrievable at template time (`codeGenerationResults` / `chunkGraph`). May
      need to read it from `compilation.getAssetPath` or the module's
      `buildInfo.filename`.
- [ ] Compute the relative path for `publicPath: "auto"`: asset filename relative to the
      consuming chunk's output path. Reuse existing machinery — webpack already does
      chunk-relative resolution for auto publicPath (see
      `lib/runtime/AutoPublicPathRuntimeModule.js` and `Template`/`compilation` path
      helpers). Prefer reusing that util over hand-rolling `path.relative`.
- [ ] Ensure the specifier starts with `./` or `../` (bare-looking specifiers like
      `asset.png` are ambiguous in `new URL`).

### Step 3 — Emit the analyzable expression

- [ ] In the analyzable branch, replace the **outerRange** (the whole `new URL(...)`,
      not just the args) so we control both arguments:
      `    new URL(/* asset import */ <JSON.stringify(specifier)>, import.meta.url)`
      Use the configured `import.meta` name if webpack renames it; otherwise literal
      `import.meta.url`.
- [ ] Do **not** add `RuntimeGlobals.baseURI`, `RuntimeGlobals.relativeUrl`, or
      `RuntimeGlobals.require` for this dependency in analyzable mode — that's what keeps
      the runtime out of the output. Still register the dependency on the asset module so
      the file is emitted and hashed.
- [ ] Keep the existing non-analyzable branches (`baseURI` and `relative`) untouched for
      all other configs.

### Step 4 — Asset module side

- [x] The asset file is still emitted: the asset stays in the graph via the dependency
      edge (and, when the wrapper is dropped, via the `asset` source type), so it is
      emitted and hashed regardless of whether a JS `__webpack_require__(id)` reaches it.
- [x] **Dead-wrapper cleanup (done).** When an asset is consumed _only_ by analyzable
      `new URL` in ESM output **and** the effective publicPath is a chunk-independent
      absolute string (root-absolute `/…` or `scheme://…`, no `[…]` tokens),
      `AssetGenerator.getTypes` now exposes it as `asset-url` instead of `javascript`, so
      the `module.exports = __webpack_require__.p + "…"` wrapper (and its publicPath
      runtime global) are never emitted — exactly how CSS/HTML url assets behave.
      `auto`/relative publicPaths keep the wrapper because a single literal can't be
      correct across chunks at different depths; dropping it there needs a per-chunk JS
      placeholder pass (future work). The undo-path is computed from the **consuming**
      module's chunk (not the asset's), which is required once the wrapper is gone.

### Step 5 — Edge cases & fallbacks

- [ ] `url: "relative"` parser option: in analyzable mode the relative literal already
      gives relative-to-document behavior, so prefer the literal form and skip
      `RelativeUrlRuntimeModule`. Verify semantics match.
- [ ] Data-URI / inlined assets (`type: "asset"`/`asset/inline`): if the asset is inlined
      as a `data:` URL, emit `new URL("data:...", import.meta.url)` (still analyzable) or
      keep current behavior — pick one and test it.
- [ ] `output.publicPath` as a runtime expression/function → fall back (Step 1 helper
      returns false for this dep).
- [ ] Worker / non-module chunks that can't use `import.meta` → fall back.
- [ ] Hashed filenames: make sure the literal uses the final content-hashed name (the
      template runs after hashing, or use a placeholder that gets substituted — match how
      existing asset filenames flow through `getAssetPath`).

### Step 6 — Tests

- [ ] Make Step-0 case pass.
- [ ] Add cases: `publicPath: "auto"`, literal string publicPath, `url: "relative"`,
      subdirectory output (relative path with `../`), and a fallback case (dynamic
      publicPath) asserting the old form is retained.
- [ ] Round-trip / conformance: feed the emitted bundle through esbuild (and/or webpack)
      and assert the `new URL` asset is detected and re-emitted — the real proof that
      the output is analyzable. Can start as a node script in the case's `test.js`.
- [ ] Update any affected `statsCases` / snapshots; eyeball diffs.

### Step 7 — Finalize

- [ ] `yarn fix` (fix:code + fix:special + fmt) and `yarn tsc`.
- [ ] Run targeted suites: `yarn jest test/configCases/asset-modules`.
- [ ] Changeset (`minor`): e.g. "Emit analyzable `new URL(…, import.meta.url)` for ESM
      module output."
- [ ] PR using the full org template; "What kind of change" = `feat`; branch
      `feat/...`.

## Key files

| File                                                                                                   | Role                                                              |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `lib/url/URLParserPlugin.js`                                                                           | detects `new URL(arg1, import.meta.url)`, creates `URLDependency` |
| `lib/dependencies/URLDependency.js`                                                                    | **main change** — `Template.apply` emits the expression           |
| `lib/RuntimeTemplate.js`                                                                               | add analyzable-ESM capability helper (`isModule`, `:119`/`:170`)  |
| `lib/asset/AssetGenerator.js`                                                                          | asset output filename + JS wrapper module (`:393`, `:645`)        |
| `lib/runtime/BaseUriRuntimeModule.js`, `RelativeUrlRuntimeModule.js`, `AutoPublicPathRuntimeModule.js` | runtime forms we bypass / reuse path logic from                   |
| `schemas/WebpackOptions.json`, `lib/config/defaults.js`, `lib/config/normalization.js`                 | the new flag                                                      |
| `test/configCases/asset-modules/url-*`                                                                 | existing tests to mirror                                          |

## Decisions

- **Gating: default-on for `output.module`** (no experiment flag). Analyzable form is
  emitted whenever output is a real ESM module; CJS/IIFE output is unchanged.
- **Dead wrapper: dropped for chunk-independent (absolute) publicPath**, kept otherwise
  (see Step 4). `url: "relative"` keeps its runtime polyfill (semantics differ from the
  absolute literal form).

## Open questions

- `auto`/relative publicPath wrapper-drop: needs a per-chunk JS placeholder substitution
  (like CSS's `PUBLIC_PATH_AUTO`) so a chunk-relative literal can be emitted per chunk.
