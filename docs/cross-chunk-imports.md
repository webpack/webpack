# Cross-chunk imports

`optimization.concatenateModules.crossChunkImports` (experimental, `output.module` with `chunkFormat: "module"` only) hoists the ES modules other chunks import into one top-level scope per chunk. The scope ends with `export { local as $<index><usedName> }`, and importers bind those names with a static `import`. `ChunkLinkingPlugin` (`lib/esm/`) picks the modules; `ConcatenatedModule` renders the scope.

With `true`, a size check keeps a module in the registry when linking it would grow the output: it weighs the registry factory, getters and lookups linking saves against the native exports, imports and import statements it adds (`COST` in `ChunkLinkingPlugin`, tuned so no ES module app of `test/sizeCoreReports/` grows). `"always"` skips that check, as the tests do.

Stats show why a module another chunk imports stays in the registry: its `optimizationBailout` holds `Cross-chunk imports bailout: <reason>`.

CI's `cross-chunk-imports` job runs every config case again with the option forced on wherever `output.module` and concatenation are on (`TEST_CROSS_CHUNK_IMPORTS=1`, see `test/templates/ConfigTestCases.js`).

## What links

- **Named and namespace imports.** A namespace used as a value, or as the `this` of `ns.f()`, binds an inline namespace object the scope exports under `$<index>`. The scope exports only the names and namespace objects other modules read.
- **Re-exports** (`export { x } from`, `export * from` with known exports, `export * as ns from`), from registry and concatenated modules alike.
- **Importers in the same chunk.** A registry module binds its own chunk's scope through a self-import.
- **Initial chunks** other than the entry and runtime chunks, when every importer is in an initial-only chunk.
- **Side effects**, when every load of the chunk runs them before any other effect, in one order all loads agree on. A load is an entry or one `import()`. The modules the `import()`'s origin statically imports count as already run.
- **Anonymous default functions**, named inline instead of through `__webpack_require__.dn`.

## Limitations

These stay in the registry, by design or until future work lifts them:

| Case                                                                                        | Why                                                                                             | Future work                                                                                       |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Module in more than one chunk                                                               | A copy per chunk splits its state and identity                                                  | Needs `splitChunks` to place it once                                                              |
| CommonJS module or `require()` importer                                                     | Reads the registry's module object                                                              | None planned                                                                                      |
| Hot module replacement                                                                      | A static binding can't be swapped; HMR already bails concatenation                              | None planned                                                                                      |
| Entry or runtime chunk                                                                      | The page picks the entry's URL, so a static import of it can evaluate it twice                  | Import through a URL the runtime knows                                                            |
| On-demand importer of an initial chunk                                                      | It resolves against `publicPath`, the entry's imports against the entry's URL                   | Same as above                                                                                     |
| Chunk shared by more than one runtime                                                       | Each runtime keeps its own instance                                                             | None planned                                                                                      |
| Chunk loaded both initially and on demand                                                   | Two URLs can mean two instances                                                                 | Same as entry chunks                                                                              |
| Side effects some load skips or runs after another effect                                   | The scope runs them when the chunk loads                                                        | Wrap each in an init function called where the import was, like rolldown's `strictExecutionOrder` |
| Side effects with `output.strictModuleExceptionHandling` and no `strictModuleErrorHandling` | The registry runs a module that threw again on the next import; a native module keeps its error | None planned                                                                                      |
| `import()`, deferred import, re-export the registry checks at runtime                       | Need the registry's exports object or loader                                                    | None planned                                                                                      |
| `__webpack_require__`, `__webpack_public_path__`, `new URL()` and other runtime uses        | The scope runs where no runtime is bound                                                        | Pass the needed runtime values in                                                                 |
| Non-identifier used export name                                                             | `export { … as name }` needs an identifier                                                      | Use string export names where supported                                                           |
| Eval devtools, non-module chunk formats                                                     | No native `export` can stand there                                                              | None planned                                                                                      |

Other limits:

- **Timing:** a linked effect runs when its chunk's file evaluates, not inside the `import()` callback. Order among modules holds; interleaving with unrelated async code can differ.
- **Bytes:** with `true`, the size check keeps every ES module sample app at or below its registry size (`node-ssr-esm`: 98,702 → 97,997 bytes gzipped). With `"always"`, a namespace used as a value costs an inline namespace object: in a two-export example the shared chunk grows from 162 to 241 bytes gzipped.
