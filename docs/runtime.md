# Runtime code ships to every target

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps its rules and a pointer here. -->

Runtime-emitting code — chunk loading (`lib/web/` JSONP, `lib/esm/`, `lib/node/`, `lib/webworker/`), prefetch/preload/resource hints, library and externals presets — is **per-target**: browsers/JSONP, ESM `output.module`, `node`, `webworker`, `deno`, `electron`, `bun`, and the **universal** `target: "universal"` / `["web", "node"]` neutral-platform path each have their own module or wiring — changing one and forgetting the others is the easy mistake. Apply a change to **every** affected target, with an integration case per target (typically `target: "web"`, `output.module`, `target: "universal"` or `["web", "node"]`; plus `node`/`webworker`/`bun`/`deno`/`electron` when in scope). The universal runtime guards browser APIs behind `typeof document === "undefined"` so its bundles run in Node without a DOM, and its config case must gate DOM assertions on `typeof document !== "undefined"` (see `configCases/target/universal-prefetch-preload`).

**Then check wire cost** with `yarn test:size` (and the `Code Size` CI job, which comments the diff on the PR). It is information, never a verdict; how to read its report: [docs/performance.md](performance.md#reading-the-code-size-report). When the numbers moved, say what it reported in the PR.

## Keep emitted runtime small

Every byte a runtime module emits ships in every user's bundle that needs it, and a minifier can't recover most of the waste. Before writing or changing an emitted string, go through this list, then run `yarn test:size` and report the change in the PR.

**Use the `RuntimeTemplate` helper, never a hand-written form it covers.** Each one picks the shortest form `output.environment` allows and keeps the ES5 fallback:

| Hand-written                                    | Helper                                       |
| ----------------------------------------------- | -------------------------------------------- |
| `function(a, b) { … }`                          | `basicFunction`, `returningFunction`         |
| `function() {}`                                 | `emptyFunction`                              |
| `var x = …`                                     | `renderConst()`, `renderLet()`               |
| `x = x \|\| y`, `if (x === undefined) x = y`    | `assignOr("x", "y")` (when `""`/`0` is safe) |
| `a && a.b`                                      | `optionalChaining("a", "b")`                 |
| `Object.prototype.hasOwnProperty.call(o, k)`    | `objectHasOwn("o", "k")`                     |
| `var a = arr[0], b = arr[1]`                    | `destructureArray`, `destructureObject`      |
| `"a" + b + "c"`                                 | `concatenation`                              |
| `for (var i = 0; i < a.length; i++) { … a[i] }` | `forEach`                                    |
| `name: function () { … }` inside an object      | `method`                                     |

**Write what terser can't shorten.** It keeps unused parameters, property names and string keys, repeated `__webpack_require__.x` chains, default arguments such as `.bind(null, void 0, …)`, default descriptor fields (`configurable: false`) and guards on values the code already relies on:

```diff
 // `event` is dereferenced one line earlier, so the guard is dead
-var errorType = event && event.type;
+var errorType = event.type;
```

**Emit only what this config runs.** Gate code behind the condition that needs it (HMR, a feature flag, whether any import reads the value), rather than emitting it for every build and relying on the minifier to drop it.

**Prove equivalence before shortening.** Check every value the expression can hold:

- Falsy values: `||` overwrites `0`, `""` and `false`, so `assignOr` is only safe when those can't occur or rewriting them changes nothing.
- Prototype keys: a chunk or module id such as `constructor` reads `Object.prototype`, so keep `hasOwnProperty` guards on id-keyed objects.
- The ES5 fallback, for every helper whose modern form you measured.
- Third-party overrides: a plugin or user can replace `__webpack_require__.*` functions and hooks, so keep a guard whose input comes from outside webpack unless you can prove it's dead.
