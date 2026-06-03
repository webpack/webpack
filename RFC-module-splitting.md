# RFC: Module Splitting ("module parts") for cross-chunk tree-shaking

- **Status:** Draft / proposal (no behavior change yet)
- **Tracking issue:** [#20537](https://github.com/webpack/webpack/issues/20537) (see also [#20288](https://github.com/webpack/webpack/issues/20288))
- **Owner:** _TBD_
- **Gating:** Everything proposed here lands behind an `experiments.*` flag and is off by default.

## 1. Summary

A module is currently the **atomic unit** of webpack's module graph, chunk graph,
code generation, and runtime. When a single source module exposes one export that
is needed eagerly (initial chunk) and another export that is needed only through an
async boundary, webpack cannot place those two exports in different chunks — the
whole module lives in exactly one chunk, and every export _used anywhere in that
module's runtime_ is emitted there.

This RFC proposes an opt-in **module-parts** subsystem that splits a module into
per-export (and per-side-effect) fragments so that fragments can be placed
independently by the existing chunk graph. This is the capability Turbopack ships as
"module fragments". The goal is to let async-only exports follow the async chunk
instead of bloating the initial chunk.

## 2. Problem statement

### 2.1 Minimal reproduction (#20537, vue-loader)

A Vue SFC compiles to a `<script>` module that has both a named export (`opts`,
route metadata) and a `default` export (the component). The app:

```js
import { opts } from "./test.vue"; // static — wants the metadata eagerly
import("./test.vue").then((m) => m.default); // async — wants the component lazily
```

vue-loader emits an intermediate SFC module roughly like:

```js
import script from "./test.vue?vue&type=script";
export * from "./test.vue?vue&type=script"; // carries `opts`
export default script; // carries the component
```

Observed module graph (verified against this repo with `concatenateModules:false`):

```
entry --import{opts}--> sfc --export*-------------> script   (provides opts)
entry --import()------> sfc --export default script-> script (provides default) [async]
```

`script.default` (the component object) ends up in the **initial** chunk, even though
nothing in the initial chunk uses it.

### 2.2 Why it happens

Three independent facts combine:

1. **Module = atomic chunk unit.** `script` is pulled into the initial chunk because
   `opts` is statically imported through `sfc`. A module lives in one chunk;
   `buildChunkGraph` places whole modules (`lib/buildChunkGraph.js`, invoked from
   `lib/Compilation.js:3466`).
2. **Usage is tracked per-runtime, not per-chunk.** `FlagDependencyUsagePlugin`
   (`compilation.hooks.optimizeDependencies`) marks `script.default` used in the
   _entry runtime_, because `sfc`'s `export default script` re-export is consumed by
   the async `import("./sfc")`.
3. **Async chunks share the entrypoint runtime.** The async chunk for the route does
   not get its own runtime; it reuses the entry runtime (`getEntryRuntime`,
   `lib/util/runtime.js`). So "used in this runtime" includes async-only usage.

The codegen gate that _would_ drop the export is keyed on `(export, runtime)`:

- `lib/dependencies/HarmonyExportExpressionDependency.js:159-163` and `:207-219`
  (`export default`) call
  `moduleGraph.getExportsInfo(module).getUsedName("default", runtime)`.
- `lib/dependencies/HarmonyExportSpecifierDependency.js:133-144` (named exports) does
  the same with `getUsedName(dep.name, runtime)`.
- `getUsedName` itself: `lib/ExportsInfo.js:1316`.

Because `runtime` is the entry runtime and the async side marks `default` used, the
getter and declaration are emitted in the initial chunk. Empirically, removing the
async import alone makes `default` tree-shake away (`/* unused */ null && (...)`),
confirming the analysis is correct and the only lever is _granularity_.

### 2.3 Current workarounds (no core change)

- **Restructure the source** so the eager export lives in a different module from the
  lazy `default`. Verified: moving `opts` into its own `.js` module removes the
  component from the initial chunk entirely.
- The community **`webpack-import-splitter-loader`** rewrites imports to achieve the
  split at the loader level.

These remain the recommended answers until/unless this feature lands.

## 3. Goals / non-goals

**Goals**

- Allow an async-only export of a shared module to be placed in the async chunk that
  uses it, behind an experiments flag, with no change to default behavior.
- Preserve ESM semantics: evaluation order, side effects, TDZ, live bindings,
  circular imports, namespace identity.
- Keep the steady-state (flag off) hot paths allocation-free; pay cost only when the
  flag is on and only for modules that actually split.

**Non-goals (initial)**

- Splitting CommonJS modules, or modules with `module.exports` reflection.
- Splitting modules with non-statically-analyzable exports (`export *` from a dynamic
  target) — these bail out.
- Beating Turbopack on coverage. We start with the tractable subset and grow.

## 4. Prior art: Turbopack module fragments

Turbopack represents each module as a set of **parts** (`ModulePart`):

- one part per top-level statement / declaration / export,
- an **Evaluation** part holding side-effecting top-level statements that must run on
  import,
- a **Facade** part that aggregates all exports (local + re-exported) and is the
  target of `import * as ns` / dynamic import.

Chunking then places **parts**, so two exports of one source file can land in two
chunks. A lighter "ReexportsOnly" mode only separates local exports from re-exports,
letting importers bypass intermediate re-export modules — relevant to the vue case,
where the SFC is a pure re-export layer.

Sources:

- https://deepwiki.com/vercel/next.js/2.4-tree-shaking-and-code-optimization
- https://github.com/orgs/web-infra-dev/discussions/29

## 5. Why this is not a small patch

Two sub-problems must both be solved for the #20537 shape, and the second is what
makes a "one-level" PoC insufficient:

1. **Leaf split.** Split `script` so `default` is a separate fragment from `opts`.
   Tractable on its own for **named** exports consumed via `import { x }` specifier
   dependencies (verified below).
2. **Re-export layer + namespace facade.** `sfc` is itself in the initial chunk (it
   carries `opts` via `export *`), and `import("./sfc")` materializes `sfc`'s entire
   namespace — including `default`. So `sfc` must _also_ be fragmented, and the
   dynamic import must resolve to a **facade** that pulls each export from its
   fragment. This is recursive and requires synthesizing namespace objects across
   chunk boundaries.

Empirical check performed for this RFC:

- Clean **named-export** async shape (`import { B }` only, no namespace): the bug
  reproduces (async-only `B` lands in the initial chunk) **and** a single-level
  fragment redirect is sufficient to move it. → Phase 1 is real and shippable.
- The **vue/default-reexport** shape: a single-level split cannot fix it because of
  (2). → Needs Phases 2–3.

## 6. Proposed design

### 6.1 Data model

Introduce a `ModulePart` abstraction and a way for one `NormalModule` to be
represented to the chunk graph as N placeable fragments. Two implementation
strategies, to be decided in Phase 0:

- **(A) Synthetic fragment modules.** For each split-off export, create a real module
  (modeled on `lib/RawModule.js` / the way `ConcatenatedModule` is created and wired
  in `lib/optimize/ModuleConcatenationPlugin.js:414-520`) that owns that export's
  declaration and exposes it via `__webpack_require__.d`. The host module keeps the
  remaining exports; its split-off export becomes unused and is dropped by the normal
  unused-export path (then removed by the minifier, exactly like today's
  tree-shaking). Importers are redirected per-export.
- **(B) First-class parts on the module.** Teach `ChunkGraph` to connect a `(module,
partId)` pair to a chunk, and teach code generation to emit only the requested
  part's statements per chunk. More invasive but avoids synthetic-module churn and
  serialization duplication.

Strategy (A) reuses far more existing machinery and is recommended for the early
phases; (B) may be revisited if (A)'s duplication / cache cost proves unacceptable.

### 6.1a Architecture decision: minimal core hooks + opt-in plugin (zero cost when off)

The whole feature ships as a **plugin** registered only when
`experiments.moduleSplitting` is enabled — the same shape webpack already uses for
scope hoisting (`ModuleConcatenationPlugin`), federation, and lazy compilation. This
gives the property that matters operationally:

- **Flag off → the plugin is never registered.** No analysis runs, no parts are
  allocated, no extra hook taps fire. Steady-state time and memory are unchanged.
  Tapable hooks with zero taps are effectively free (`SyncWaterfallHook` returns its
  input; `SyncHook` is a no-op), so merely _exposing_ new extension points costs
  nothing.
- **Flag on → cost is paid only for modules that actually split**, scaling with the
  number of split exports, not the graph size.

Existing extension points the plugin reuses (no new core surface required for the
self-contained subset):

- Synthetic-module creation + connection redirect — already plugin-reachable, exactly
  as `ModuleConcatenationPlugin` does (`updateModule`, `connectChunkAndModule`).
- Per-chunk source rewriting —
  `JavascriptModulesPlugin.getCompilationHooks(c).renderModuleContent` /
  `renderModulePackage` (`lib/javascript/JavascriptModulesPlugin.js:331-379`,
  `SyncWaterfallHook<[Source, Module, ModuleRenderContext]>`).

The **one** structural gap for the _general_ (Strategy B) case: code generation is
cached by `(module, runtime)` — `codeGenerationResults.get(module, chunk.runtime)`
(`lib/Compilation.js:3766`) — not per chunk/part. Emitting different statements of a
single module into different chunks would need a new hook there (e.g. a
generator-level "emit only this part-set" tap). Strategy (A) avoids this entirely by
making each part a real module with its own code generation, which is why (A) is the
recommended starting point and likely needs **no new core hooks at all** for Phases
1–3.

Candidate _new_ hooks, only if/when needed for cooperation or Strategy (B):

- `compilation.hooks.splitModule` (waterfall) — let plugins agree on a module's
  partition before usage flagging, so multiple consumers compose.
- a `JavascriptGenerator` part-filter hook — emit a subset of a module's statements
  for a given part (Strategy B only).
- a usage-granularity hook in `FlagDependencyUsagePlugin` — distinguish async-only
  usage without synthetic modules (Strategy B only).

Important caveat: hooks determine _where_ logic attaches and guarantee
zero-cost-when-off; they do **not** dissolve the correctness work (TDZ, live bindings,
evaluation order, namespace identity). That logic still lives in the plugin's taps and
is the real engineering cost — see §8.

### 6.2 Where it hooks

Perform the split in `compilation.hooks.finishModules` (after
`FlagDependencyExportsPlugin` has computed provided exports, **before**
`optimizeDependencies` runs usage flagging). Doing it here means:

- usage flagging then runs on the already-split graph, so the host's dropped export
  is naturally marked unused and the fragment's export is marked used — no manual
  `ExportsInfo` surgery, no re-running of usage;
- `buildChunkGraph` (later, `Compilation.js:3466`) places each fragment by normal
  reachability: a fragment imported only by async-reachable modules lands in the
  async chunk **for free** — we do not compute async reachability ourselves.

### 6.3 Redirecting importers

For each importer that references a split-off export via a
`HarmonyImportSpecifierDependency` (ids = `["x"]`), redirect that single dependency's
connection to the fragment with `moduleGraph.updateModule(dep, fragment)`
(`lib/ModuleGraph.js:291`). The importer's `HarmonyImportSideEffectDependency` stays
pointed at the host (preserving evaluation/side-effect order). Bulk helpers exist if
needed: `moveModuleConnections` (`:459`), `copyOutgoingModuleConnections` (`:497`),
`cloneModuleAttributes` (`:416`).

### 6.4 Namespace facade (Phase 2)

For `import * as ns from M` and `import(M)`, the namespace must still expose every
export even after M is fragmented. Synthesize a **facade module** whose code
generation builds the namespace object by pulling each export from its fragment
(`__webpack_require__.d(ns, { x: () => frag_x.x, default: () => frag_default.A })`).
The dynamic-import/namespace dependency is redirected to the facade. The facade is
cheap and itself placeable, so it follows the importer into the async chunk.

### 6.5 Recursive re-export collapse (Phase 3, the vue case)

A pure re-export module (`export *` / `export { x } from` / `export default
imported`) should not force its re-exported targets into its own chunk. Two options:

- extend the existing reexport optimization so an importer binds directly to the
  _origin_ fragment (Turbopack "ReexportsOnly"), bypassing the intermediate module; or
- fragment the re-export module too and let facades compose.

The vue SFC is exactly a pure re-export layer, so this phase is what actually fixes
#20537.

### 6.6 Code generation & runtime

No new runtime primitive is required for Strategy (A): fragments and facades emit the
existing `__webpack_require__.r` / `__webpack_require__.d` getters. The host module's
dropped export uses the existing unused-export path
(`HarmonyExportInitFragment` unused branch, `lib/dependencies/HarmonyExportInitFragment.js`).

### 6.7 Flag plumbing

Add `experiments.moduleSplitting` (name TBD), off by default:

- `schemas/WebpackOptions.json` — `Experiments` (~`:1097`) and `ExperimentsNormalized`
  (~`:1183`).
- `lib/config/defaults.js` — `applyExperimentsDefaults` (`:568-593`),
  `D(experiments, "moduleSplitting", false)`.
- `lib/config/normalization.js` — pass-through.
- `lib/WebpackOptionsApply.js` — register the new plugin when enabled.
- Regenerate `types.d.ts` / declarations via `yarn fix:special`.

## 7. Phasing

| Phase | Scope                                                                                                       | Fixes #20537? | Risk   |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| 0     | Decide model (A vs B); spike fragment creation + importer redirect                                          | no            | low    |
| 1 ✅  | Named-export single-level split (`import { x }` only); no namespace consumers — **implemented**             | no            | medium |
| 2     | Namespace facade for `import *` / `import()`                                                                | no            | high   |
| 3     | Recursive re-export collapse (pure re-export layers) → **vue shape**                                        | **yes**       | high   |
| 4     | Side-effecting & circular modules, `export default <expr>` self-containment, ConcatenatedModule interaction | yes           | high   |

Each phase is independently testable and stays behind the flag.

### 7.1 Phase 1 mechanism — validated

The Strategy-(A) mechanism was prototyped as a standalone plugin (tapping
`finishModules`, before usage flagging) and verified end-to-end on the clean
named-export shape:

```
lib.js:   export const A = {...}      // used eagerly (initial)
          export const B = {...}      // used only via the async route
route.js: import { B } from "./lib"   // route.js is the import() target
entry.js: import { A } from "./lib"; import("./route.js")
```

The plugin creates a synthetic part-module for `B`, redirects `route.js`'s import
connections (`moduleGraph.updateModule`) to it, and lets `buildChunkGraph` place it.
Result (production, minified, `target: node`), identical correct runtime output in
both builds (`A` from the initial chunk, `B` resolved through the async route):

| Build                | `B` present in initial chunk? |
| -------------------- | ----------------------------- |
| baseline (no plugin) | yes                           |
| with split plugin    | **no** — moved to async chunk |

Key confirmations: (1) once the async importer is redirected, `lib` marks `B` as
`/* unused harmony export B */` via the normal unused-export path, so the minifier
drops it from the initial chunk with no special handling; (2) `buildChunkGraph`
placed the part in the async chunk purely from graph reachability — no
async-reachability logic of our own; (3) the only codegen subtlety was emitting the
namespace via the part's own `module.exportsArgument`. On trivial fixtures the fixed
per-part wrapper overhead can exceed the moved payload; the win scales with export
size (e.g. a real component body).

**Phase 1 is now implemented in-core** behind `experiments.moduleSplitting` (off by
default): `lib/optimize/ModuleSplittingPlugin.js` (+ `SplitExportModule.js`), with a
conservative auto-detector (pure, self-contained `const` named exports) and a
sync-reachability pass so only async-only exports are split. Covered by
`test/configCases/module-splitting/named-export`. The plugin is registered only when
the flag is on, so non-users pay nothing. Known Phase-1 limitations: re-parses module
source for the self-containment analysis (should reuse the parser's scope), the
importer scan is O(modules × deps), and persistent-cache/HMR interactions are
untested.

Not yet covered (the remaining Phase 2→4 work): auto-detecting
_which_ exports are safe to split (side-effect-free **and** self-contained — no
references to other module-local bindings), reusing webpack's existing parser scope
instead of re-parsing, `export default`, namespace facades, and the recursive
re-export collapse that the vue shape needs.

## 8. Risks & constraints

- **Performance / memory.** Splitting runs on user builds; fragment objects,
  extra `ModuleGraph` connections, and extra `ExportsInfo` all add per-module-per-
  export overhead. Must be zero-cost when the flag is off and bounded when on
  (only split modules pay). See the project's performance note (#15521) on retained
  per-`Compilation` state.
- **Correctness.** ESM evaluation order and side effects (the host's `Evaluation`
  part must still run when imported for side effects), TDZ, live bindings, circular
  imports, and namespace identity (`ns === ns` across importers) must be preserved.
- **`export default <expr>` self-containment.** A default whose initializer references
  other module-local bindings cannot be moved without moving those bindings too;
  Phase 4 must detect and bail.
- **ModuleConcatenationPlugin.** Scope hoisting may re-merge fragments; ordering and
  `canBeConcatenated` rules need to account for fragments (or run splitting after, or
  mark fragments as not concatenation-eligible initially).
- **Persistent cache & serialization.** Synthetic modules must serialize
  deterministically (`makeSerializable`) or be excluded from cache; fragment identity
  must be stable across builds for `moduleIds`/`chunkIds` determinism.
- **HMR.** Fragment and facade boundaries must update correctly on edit.
- **Stats.** New module/fragment kinds need readable identifiers and stats output.

## 9. Test plan

- `test/configCases/` cases per phase asserting the async-only export is **absent**
  from the initial chunk and **present** in the async chunk, and that the bundle
  executes (namespace shape, live bindings, side-effect order).
- A faithful vue-style fixture (re-export layer + `import()` + `export default
imported`) for Phase 3.
- `watchCases/` + `hotCases/` for HMR once facades exist.
- Snapshot/`statsCases` review for any default-on output (should be none while gated).

## 10. Alternatives

- **Loader-based** (`webpack-import-splitter-loader`): no core change, opt-in per
  project; recommended interim answer. Cannot see the whole graph, so coverage is
  limited.
- **ReexportsOnly only:** ship just §6.5 (bypass re-export layers) without full
  fragmentation. Smaller, helps the vue case partially, but the leaf `script` still
  carries both `opts` and `default` in one chunk.
- **Do nothing:** keep #20537 as a parked feature; rely on workarounds. This is the
  status quo and the default if this RFC is not adopted.

## 11. Open questions

- Model (A) synthetic modules vs (B) first-class parts — which becomes the long-term
  representation?
- Should splitting be automatic (cost/benefit heuristic on export size vs. extra
  request) or require an explicit hint (magic comment / config)?
- Interaction with `optimization.usedExports: "global"` and with deterministic ids.
- Can §6.5 be delivered as an incremental win independent of the rest?

## 12. Appendix: key references in this repo

- Chunk placement: `lib/buildChunkGraph.js`; `lib/Compilation.js:3466`.
- Per-runtime usage: `lib/FlagDependencyUsagePlugin.js` (`optimizeDependencies`);
  runtime derivation `lib/util/runtime.js` (`getEntryRuntime`).
- Codegen gates: `lib/dependencies/HarmonyExportExpressionDependency.js:159-219`,
  `lib/dependencies/HarmonyExportSpecifierDependency.js:133-144`,
  `lib/ExportsInfo.js:1316` (`getUsedName`).
- Synthetic modules: `lib/RawModule.js`;
  `lib/optimize/ModuleConcatenationPlugin.js:414-520`.
- Connection redirect: `lib/ModuleGraph.js` — `updateModule:291`,
  `cloneModuleAttributes:416`, `moveModuleConnections:459`,
  `copyOutgoingModuleConnections:497`.
- Chunk wiring: `lib/ChunkGraph.js` — `connectChunkAndModule`, `replaceModule`.
- Flag plumbing: `schemas/WebpackOptions.json` (`Experiments`,
  `ExperimentsNormalized`); `lib/config/defaults.js:568-593`;
  `lib/config/normalization.js`; `lib/WebpackOptionsApply.js`.
