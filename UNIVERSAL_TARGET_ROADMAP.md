# Universal target — remaining work + new runtimes (Deno, Bun)

> Status: `target: "universal"` shipped in webpack/webpack#21214 (browser + web worker +
> Node.js + Electron + NW.js, ESM-only, `require: false`), plus the comprehensive
> `configCases/target/universal-all-module-types` test and a `Defaults` snapshot.
>
> This file lists what's left: 4 universal limitations + 2 new runtime targets.
> Each task below is self-contained — copy one into a fresh session to work on it.

---

## 1. Universal: CSS hot updates don't apply on the Node side

### Context

`target: "universal"` runs one bundle in browser + Node. JS/ESM module HMR works in both,
but live **CSS** hot updates are skipped on Node. In `lib/css/CssLoadingRuntimeModule.js`
(~line 495) the `__webpack_require__.hmr…` `.css` handler bails when there's no DOM:

```js
isNeutralPlatform ? "if (typeof document === 'undefined') return;" : "",
```

`isNeutralPlatform` (`!platform.web && !platform.node`) is true for universal, so the Node
runtime never refreshes the SSR style store filled by `lib/css/CssInjectStyleRuntimeModule.js`
(~line 82). Fixtures encode the gap: `test/hotCases/universal/css-export-type-style/index.js`
guards its asserts with `if (typeof document !== "undefined")`.

### Goal

On the Node side, re-read the emitted hot-update CSS and refresh the SSR style store instead
of returning early.

### Approach

- Replace the `typeof document === 'undefined'` early-return in the `.css` HMR handler with a
  Node branch that loads the updated CSS the same way initial SSR collection does (dynamic
  `import('fs')`, see the `isNeutralPlatform` branch ~`CssLoadingRuntimeModule.js:347`).

### Tests

- `test/hotCases/universal/css*` — drop/extend the `typeof document` guards so the node run
  asserts the update applied. `yarn jest -t "HotTestCases" -t "universal"`.

### Acceptance

CSS hot updates are observable on the Node side of a universal build.

---

## 2. Universal: Web Workers under pure `node` target need a global `Worker`

### Context

The `Worker` resolver (`RuntimeGlobals.worker` → `lib/runtime/WorkerRuntimeModule.js`, which
falls back to `worker_threads.Worker`) is only emitted for universal:

```js
// lib/dependencies/WorkerDependency.js:144
if (ctorRange && runtimeTemplate.isUniversalTarget()) {
	runtimeRequirements.add(RuntimeGlobals.worker);
	source.replace(ctorRange[0], ctorRange[1] - 1, RuntimeGlobals.worker);
}
```

So plain `target: "node"` emits `new Worker(new URL(...))` expecting a global `Worker`
(absent in Node) → `ReferenceError`.

### Goal

Emit the resolver for Node targets too, not just universal.

### Approach

- Broaden the condition, e.g. `runtimeTemplate.isUniversalTarget() || (platform.node && !platform.web)`.
- Confirm `WorkerRuntimeModule` selects the `worker_threads` path for plain node.

### Tests

- Add `test/configCases/worker/node/` (`target: "node"`, ESM) spawning a module worker via
  `new Worker(new URL("./worker.js", import.meta.url), { type: "module" })`; gate with a
  Node-version `test.filter.js`.

### Acceptance

`target: "node"` can create a `new Worker(new URL(...))` without a global `Worker`.

---

## 3. Universal: prefetch/preload are silent no-ops on Node (document-only)

### Context

Under universal, `prefetchChunkHandlers`/`preloadChunkHandlers` bail with
`if (typeof document === 'undefined') return;`
(`lib/esm/ModuleChunkLoadingRuntimeModule.js:268, 308`, and the CSS equivalents in
`lib/css/CssLoadingRuntimeModule.js`). These are browser resource hints, so a Node no-op is
correct — but it's currently undocumented and looks like a bug.

### Goal

Make the web-only behavior explicit (lowest-risk: document it).

### Approach

- Add a one-line comment at each `isNeutralPlatform` prefetch/preload bail noting it's an
  intentional web-only hint; add a short note to the universal-target docs.

### Tests

- None (no behavior change).

### Acceptance

prefetch/preload-on-Node is a documented intentional no-op, not a silent skip.

---

## 4. Universal: no universal HMR client/transport for Node

### Context

The HMR **runtime** (download/apply) works on Node under universal (import-based,
`lib/esm/ModuleChunkLoadingRuntimeModule.js`). What's missing is a universal HMR
**client/transport** to trigger update checks on both platforms. Shipped clients are
platform-specific: `hot/dev-server.js` (EventSource, web), `hot/signal.js` (Unix process signal, node),
`hot/poll.js` (anywhere). Only lazy compilation has a universal transport
(`hot/lazy-compilation-universal.js`, wired in `lib/WebpackOptionsApply.js:471-497`).

### Goal

Provide a universal regular-HMR client (or document that Node universal HMR must use a
Node-compatible trigger like `webpack/hot/poll`).

### Approach

- Add `hot/dev-server-universal.js` branching on `typeof EventSource` (mirroring
  `hot/lazy-compilation-universal.js`), falling back to poll/signal on Node.

### Tests

- Extend `test/hotCases/universal/*` to exercise the Node-side transport.

### Acceptance

Universal builds have a documented, working HMR trigger on Node.

---

## 5. New target: `deno` / `denoX.Y`

### Context

webpack has no `deno` target. Deno is ESM-first and implements web-standard APIs (`fetch`,
web `Worker`, `WebAssembly`, `TextEncoder`), supports `https:`/`jsr:`/`npm:` and `node:`
specifiers, exposes `globalThis` + a `Deno` global, and has no `document`.

### Goal

Add a `deno[X[.Y]]` target to the `TARGETS` array in `lib/config/target.js`, version-dependent
like `node` (use the existing `versionDependent` helper for the ECMA flags).

### Proposed target properties (verify against runtime/version before finalizing)

| prop                                                                                                     | value                            | rationale                                                 |
| -------------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------- |
| `node`                                                                                                   | `false`                          | not the Node platform                                     |
| `web`                                                                                                    | `true`                           | http(s)/std imports available (matches the `web` typedef) |
| `webworker`                                                                                              | `false`                          |                                                           |
| `browser`                                                                                                | `false`                          | no DOM                                                    |
| `electron` / `nwjs`                                                                                      | `false`                          |                                                           |
| `document`                                                                                               | `false`                          | no DOM                                                    |
| `importScripts`                                                                                          | `false`                          |                                                           |
| `importScriptsInWorker`                                                                                  | `true`                           | module workers via `new Worker(url, {type:"module"})`     |
| `fetchWasm`                                                                                              | `true`                           | `WebAssembly.instantiateStreaming(fetch(...))`            |
| `nodeBuiltins`                                                                                           | `true`                           | `node:` specifiers supported                              |
| `require`                                                                                                | `false`                          | ESM-only (`createRequire` via node-compat)                |
| `global`                                                                                                 | `false`                          | uses `globalThis`                                         |
| `globalThis`                                                                                             | `true`                           |                                                           |
| `module` / `dynamicImport` / `dynamicImportInWorker`                                                     | `true`                           | native ESM                                                |
| other ECMA (`const`, `arrowFunction`, `asyncFunction`, `optionalChaining`, `hasOwn`, `bigIntLiteral`, …) | `versionDependent(major, minor)` | fill from a Deno feature table                            |

### Touch points to verify

- `lib/config/defaults.js`: `globalObject` (→ `globalThis`), `chunkFormat`/`chunkLoading`
  (ESM → `module`/`import`), `wasmLoading` (`fetch`), and `externalsPresets` (decide whether
  `node:` builtins should be externalized — may need a tweak since there's no `deno` preset).
- Worker: `new Worker(new URL(...), {type:"module"})` should map to the web Worker path.

### Tests / docs

- `test/Defaults.unittest.js`: add a `target: "deno"` snapshot.
- `test/configCases/target/`: a small case (esm import, dynamic import, `new URL` asset, async
  wasm, worker) gated by a `test.filter.js` (the harness runs on Node, so emulate or skip
  Deno-only paths as needed).
- Document the new target value.

### Acceptance

`target: "deno"` (and `denoX.Y`) resolves, builds ESM by default, and picks
`globalThis`/`import`/`fetch`-wasm without manual config.

---

## 6. New target: `bun` / `bunX.Y`

### Context

webpack has no `bun` target. Bun is a Node-compatible runtime (global `require`, `process`,
`__dirname`, `node:` builtins) that _also_ ships web APIs (`fetch`, web `Worker`,
`WebAssembly`), `globalThis`, and a `Bun` global.

### Goal

Add a `bun[X[.Y]]` target to `TARGETS` in `lib/config/target.js`, version-dependent like `node`.

### Proposed target properties (verify against runtime/version)

| prop                                                 | value                            | rationale                                                            |
| ---------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `node`                                               | `true`                           | Node-compatible (require, `node:` builtins, `__dirname`)             |
| `web`                                                | `false`                          | no native http(s) import resolution                                  |
| `webworker` / `browser` / `electron` / `nwjs`        | `false`                          |                                                                      |
| `document`                                           | `false`                          | no DOM                                                               |
| `importScripts` / `importScriptsInWorker`            | `false` / `true`                 | module workers supported                                             |
| `fetchWasm`                                          | `true`                           | Bun has `fetch` + `WebAssembly` (unlike Node, where this is `false`) |
| `nodeBuiltins`                                       | `true`                           |                                                                      |
| `nodePrefixForCoreModules`                           | `true`                           | `node:` prefix supported                                             |
| `require`                                            | `true`                           | global `require` available                                           |
| `global`                                             | `true`                           | Node-style `global` present                                          |
| `globalThis`                                         | `true`                           |                                                                      |
| `module` / `dynamicImport` / `dynamicImportInWorker` | `true`                           | ESM supported                                                        |
| other ECMA flags                                     | `versionDependent(major, minor)` | fill from a Bun feature table                                        |

> Note: Bun ≈ the `node` target **plus** `fetchWasm: true` and a web-standard `Worker`. Start
> from the `node` entry, adjust those two, then tune ECMA flags per Bun version.

### Touch points to verify

- `lib/config/defaults.js`: `globalObject` (→ `global`), `chunkLoading` (node builtins/require →
  `async-node`/`require`, or `import` for ESM output), `wasmLoading` (could be `fetch` instead
  of `async-node`), `externalsPresets.node` (applies via `node: true`).
- Worker: web-standard `Worker` is global in Bun, so `WorkerRuntimeModule` should prefer the
  global `Worker` path (ties into task #2 above).

### Tests / docs

- `test/Defaults.unittest.js`: add a `target: "bun"` snapshot.
- `test/configCases/target/`: a small case (require interop, esm, dynamic import, async wasm,
  worker), gated by `test.filter.js`.
- Document the new target value.

### Acceptance

`target: "bun"` (and `bunX.Y`) resolves, picks Node-style loading + `global` + `fetch`-wasm,
and supports workers without manual config.

---

## Cross-cutting notes

- `schemas/WebpackOptions.json` already accepts any non-empty `target` string, so **no schema
  change** is needed for `deno`/`bun` — they're validated at runtime by `getTargetProperties`.
- Once `deno`/`bun` exist, decide whether the **`universal`** preset should stay
  browser+worker+node+electron+nwjs (a universal ESM bundle already runs on Deno/Bun since it
  runs on web+node) or explicitly fold them in. Recommendation: no change, just a docs sentence.
