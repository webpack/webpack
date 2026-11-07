# Loader threads

Webpack runs a module's loader chain on a worker thread when its rule sets `threads: true`. This is a built-in module-build capability, not a loader: nothing is added to `module.rules[].use`.

The supported loader API is the subset [thread-loader](https://github.com/webpack-contrib/thread-loader) supports. When code and this file disagree, fix one of them in the same commit.

## Configuration

```js
module.exports = {
	experiments: {
		threads: {
			max: 4,
			loaders: {
				parallelJobs: 20,
				poolTimeout: 500
			}
		}
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				use: ["babel-loader"],
				threads: true
			}
		]
	}
};
```

- `experiments.threads` must be on; otherwise the rule flag is ignored and the chain runs on the main thread.
- `threads: true` on a matching rule runs the module's whole loader chain in a worker; a later matching rule can override it with `threads: false`.
- `max` is shared with `compiler.worker`.
- `loaders.parallelJobs` is how many loader jobs one thread may run at once (minimum `1`); the CPU part still runs one at a time.
- `loaders.poolTimeout` is how long an idle thread survives after a loader job.

## Why the whole chain

thread-loader is a pitch loader: it borrows `loader-runner`'s pitch/normal ordering and takes over the rest of the chain at its own position. Without adding a loader, supporting an arbitrary split point means changing the runner's pitch/normal orchestration. The first version runs the whole chain, so the behavior stays predictable. A loader that cannot run in a worker makes the whole module fall back or fail; it cannot stay on the main thread alone.

## Worker side

`LoaderWorker.js` runs `loader-runner` with a context equivalent to thread-loader's:

- `this.async()` / `this.callback()`
- `this.getOptions(schema)`
- `this.resolve()` / `this.getResolve()`
- `this.loadModule()` / `this.importModule()`
- `this.emitWarning()` / `this.emitError()`
- `this.getLogger()`
- `this.cacheable()`
- `this.addDependency()` / `addContextDependency()` / `addMissingDependency()` / `addBuildDependency()`
- `this.exec()`
- `this.utils.createHash()`
- `this.resourcePath` / `resourceQuery` / `resourceFragment`
- `this.mode` / `target` / `minimize` / `sourceMap` / `rootContext` / `environment` / `hot`
- `this._compilation` / `this._compiler` snapshots
- `this.options.context`
- `this.webpack === true`

`this.exec()` is available only in a worker job, like thread-loader. The main-thread fallback does not provide it, and `loadModule` does not pass back its fourth `module` argument.

### Not supported

- `this.emitFile`
- loader APIs injected by main-thread plugins
- a custom `inputFileSystem` / memfs (the module falls back to the main thread)
- a `readResource` hook for the module's initial resource (the module falls back to the main thread; source maps use the main-thread hook)
- functions or symbols inside loader options
- the full `this._compilation` / `this._compiler`
- `compilation.hooks.assetPath` rewrites, and path placeholders the snapshot does not carry; `this._compilation.getPath` covers the common name/hash/contenthash forms
- `this._module`

`this.emitFile` throws a clear error. If the job itself cannot be structured-cloned, the module falls back to the main thread before any loader starts; a loader result that cannot be cloned fails the build instead of running the chain twice.

## Main thread

`NormalModule._doBuild()` keeps:

- `beforeLoaders`
- the main loader context used by RPC handlers
- `processResult`
- `createSource` and source-map handling
- `ModuleBuildError` wrapping

The worker reads the resource, runs the chain, and returns:

- the loader result array
- `cacheable`
- file, context, missing and build dependencies

The main thread applies those to `buildInfo`, then continues through the existing result pipeline.

## RPC

While a loader job runs, the worker may send `rpc` messages:

| Method         | Main-side call               |
| -------------- | ---------------------------- |
| `resolve`      | `loaderContext.resolve`      |
| `getResolve`   | `loaderContext.getResolve`   |
| `loadModule`   | `loaderContext.loadModule`   |
| `importModule` | `loaderContext.importModule` |
| `readResource` | `hooks.readResource`         |
| `emitWarning`  | `loaderContext.emitWarning`  |
| `emitError`    | `loaderContext.emitError`    |
| `getLogger`    | `loaderContext.getLogger`    |
| `logger`       | the logger method            |

`emitWarning`, `emitError`, `getLogger` and `logger` do not wait for a result. The rest do.

## Process model

- `worker_threads`, not child processes.
- While a loader job has `loadModule` or `importModule` in flight, other modules in the same compilation run their loaders on the main thread. This avoids a worker waiting on a build that waits on a worker, and lowers parallelism during nested builds.
- A native addon or a loader that changes process-global state is outside the guarantee; such loaders should stay on the main thread or use the external thread-loader package.
- A worker crash rejects the module build with the worker id and exit code.

## Cache

`NormalModule.identifier()` distinguishes `threads: true` from the main-thread path, so the two never share a module cache entry. `getUnsafeCacheData()` carries the flag too.

## Files

| File                             | Holds                                            |
| -------------------------------- | ------------------------------------------------ |
| `lib/loaders/loaderThreadJob.js` | main-thread dispatch and RPC bridge              |
| `lib/loaders/LoaderWorker.js`    | `loader-runner` + the worker-side loader context |
| `lib/worker/WorkerChild.js`      | RPC context and job dispatch                     |
| `lib/worker/WorkerPool.js`       | loader jobs beside plain calls                   |
| `lib/module/NormalModule.js`     | rule flag, `_doBuild` dispatch, cache key        |

## Tests

- `test/configCases/loader-threads/basic`: async loader, options, `resolve`, `loadModule`, `importModule`, logger, warning, cacheable, dependencies.
- `test/configCases/loader-threads/fallback`: options that cannot be cloned run on the main thread.
- `ConfigCacheTestCases` runs the same cases against the persistent cache.
