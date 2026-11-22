# Cross-chunk imports

`optimization.concatenateModules.crossChunkImports` (experimental, `output.module` with `chunkFormat: "module"` only) hoists the ES modules other chunks import into one top-level scope per chunk. The scope ends with `export { local as $<index><usedName> }`, and importers bind those names with a static `import`. `ChunkLinkingPlugin` (`lib/esm/`) picks the modules; `ConcatenatedModule` renders the scope.

Stats show why a module another chunk imports stays in the registry: its `optimizationBailout` holds `Cross-chunk imports bailout: <reason>`.

## What links

- **Named and namespace imports.** A namespace used as a value, or as the `this` of `ns.f()`, binds an inline namespace object the scope exports under `$<index>`.
- **Importers in the same chunk.** A registry module binds its own chunk's scope through a self-import.
- **Initial chunks** other than the entry and runtime chunks, when every importer is in an initial-only chunk.
- **Side effects**, when every load of the chunk runs them before any other effect, in one order all loads agree on. A load is an entry or one `import()`. The modules the `import()`'s origin statically imports count as already run.
- **Anonymous default functions**, named inline instead of through `__webpack_require__.dn`.

## Limitations

These stay in the registry, by design or until future work lifts them:

| Case                                                                                 | Why                                                                            | Future work                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Module in more than one chunk                                                        | A copy per chunk splits its state and identity                                 | Needs `splitChunks` to place it once                                                              |
| CommonJS module or `require()` importer                                              | Reads the registry's module object                                             | None planned                                                                                      |
| Hot module replacement                                                               | A static binding can't be swapped; HMR already bails concatenation             | None planned                                                                                      |
| Entry or runtime chunk                                                               | The page picks the entry's URL, so a static import of it can evaluate it twice | Import through a URL the runtime knows                                                            |
| On-demand importer of an initial chunk                                               | It resolves against `publicPath`, the entry's imports against the entry's URL  | Same as above                                                                                     |
| Chunk shared by more than one runtime                                                | Each runtime keeps its own instance                                            | None planned                                                                                      |
| Chunk loaded both initially and on demand                                            | Two URLs can mean two instances                                                | Same as entry chunks                                                                              |
| Side effects some load skips or runs after another effect                            | The scope runs them when the chunk loads                                       | Wrap each in an init function called where the import was, like rolldown's `strictExecutionOrder` |
| Re-export (`export … from`) from another chunk, `import()`, deferred import          | Need the registry's exports object or loader                                   | Link re-exports as aliases                                                                        |
| `__webpack_require__`, `__webpack_public_path__`, `new URL()` and other runtime uses | The scope runs where no runtime is bound                                       | Pass the needed runtime values in                                                                 |
| Non-identifier used export name                                                      | `export { … as name }` needs an identifier                                     | Use string export names where supported                                                           |
| Eval devtools, non-module chunk formats                                              | No native `export` can stand there                                             | None planned                                                                                      |

Other limits:

- **Timing:** a linked effect runs when its chunk's file evaluates, not inside the `import()` callback. Order among modules holds; interleaving with unrelated async code can differ.
- **Bytes:** about neutral. A namespace used as a value also exports every named binding.
