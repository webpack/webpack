# Persistent cache

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps its rules and a pointer here. -->

Persistent caching is a shipped feature, not a test mode. `ConfigCacheTestCases` re-runs **every** `configCases/` case its `test.filter.js` doesn't skip with `cache.type: "filesystem"` and fails it if the second or third run writes to the pack unexpectedly (an `infrastructure-log.js` declares an expected write, see below):

```
Pack got invalid because of write to: <identifier>
```

`<identifier>` was **not** restored but rebuilt — on a user's machine, work redone every incremental build. **Treat it as a defect and find the cause**; don't silence it.

The cache serializes the module graph, so every new serializable class (a `Module`, `Dependency` or error subclass, a cached value, …) must call `makeSerializable(...)` (~140 files do), and `yarn fix:serializables` regenerates `internalSerializables`. Forgetting is the most common cause, silent apart from the line above. The suite runs with `infrastructureLogging.debug`, so the log usually names the cause a few lines earlier:

- `No serializer registered for <Class>` — the class never called `makeSerializable(...)`.
- `Skipped not serializable cache item '<key>'` — something reachable from the value can't be written.
- `Restoring failed for <identifier> from pack: <err>` — written, but deserialization threw. It re-enters the constructor with **no arguments**, so a constructor dereferencing a parameter (`err.message`) must guard (`err ? err.message : ""`).
- Nothing — the identifier isn't stable between runs, or the module reports it needs rebuilding.

**Never silence it with `test.filter.js`** (`module.exports = (config) => !config.cache`): that drops the case from the cache suite entirely, including the parts that worked. A new case must pass both suites. (Gating a fixture needing post-baseline syntax is different and fine — see [Target the Node baseline](../AGENTS.md#target-the-node-baseline).)

The one expected write webpack ships is a module carrying a **build error**: `NormalModule.needBuild` returns true while `this.error` is set, since errors are retried every build. A case whose subject is an error therefore invalidates the pack by design and says so with an `infrastructure-log.js` returning `[/Pack got invalid because of write to/]` when `cache.type === "filesystem"` (~20 cases do). That's the only expectation needing no justification; any other must carry, next to it, why it isn't a bug — "it is noise here" isn't a reason.

## Diagnostics

**`makeSerializable` follows from where a diagnostic is created.** Anything reachable from a module (`ModuleError`, `ModuleWarning`, `ModuleBuildError`) is serialized with the module graph and must register. One built after seal and pushed onto `compilation.warnings` never enters the pack, which is why the size-limit and duplicate-package warnings register nothing. A wrong guess is silent except for `Pack got invalid because of write to:` under `ConfigCacheTestCases`, so cover a new diagnostic there.
