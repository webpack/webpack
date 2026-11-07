# Incremental watch rebuilds

`incremental` controls module graph reuse between watch compilations of the same
compiler. It defaults to `true` in every mode. Separate builds do not share this
state.

```js
module.exports = {
	incremental: true
};
```

| Value                         | Behavior                            |
| ----------------------------- | ----------------------------------- |
| `true`, `{}` or omitted       | Reuse the module graph during watch |
| `false`                       | Build a new module graph each time  |
| `{ buildModuleGraph: true }`  | Reuse the module graph during watch |
| `{ buildModuleGraph: false }` | Build a new module graph each time  |

`cache` and `incremental` are independent. With `cache: false`, incremental watch
rebuilds can still reuse the graph. With `incremental: false`, memory or filesystem
cache can still reuse individual computations.

Graph reuse updates changed modules and their dependencies. It falls back to a
new graph when build-time module loading or execution prevents safe reuse.

This option controls only module graph rebuilding. It does not add separate
switches for chunk graphs, code generation, hashing or assets. Unlike
[Rspack's incremental option](https://rspack.rs/config/incremental), the default
also applies to production watch builds, preserving this implementation's behavior.
