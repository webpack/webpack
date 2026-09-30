# Runtime code ships to every target

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps its rules and a pointer here. -->

Runtime-emitting code — chunk loading (`lib/web/` JSONP, `lib/esm/`, `lib/node/`, `lib/webworker/`), prefetch/preload/resource hints, library and externals presets — is **per-target**: browsers/JSONP, ESM `output.module`, `node`, `webworker`, `deno`, `electron`, `bun`, and the **universal** `target: "universal"` / `["web", "node"]` neutral-platform path each have their own module or wiring — changing one and forgetting the others is the easy mistake. Apply a change to **every** affected target, with an integration case per target (typically `target: "web"`, `output.module`, `target: "universal"` or `["web", "node"]`; plus `node`/`webworker`/`bun`/`deno`/`electron` when in scope). The universal runtime guards browser APIs behind `typeof document === "undefined"` so its bundles run in Node without a DOM, and its config case must gate DOM assertions on `typeof document !== "undefined"` (see `configCases/target/universal-prefetch-preload`).

**Then check wire cost** with `yarn test:size` (and the `Code Size` CI job, which comments the diff on the PR). It is information, never a verdict; how to read its report: [docs/performance.md](performance.md#reading-the-code-size-report). When the numbers moved, say what it reported in the PR.
