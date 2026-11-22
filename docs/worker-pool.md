# Worker pool

`lib/worker/` runs CPU-heavy plugin work on `worker_threads`. One pool per process owns the threads, shared by every compiler that turns `experiments.threads` on, and `compiler.worker(workerPath, options)` binds a module to it. A thread is not tied to one module, one call or one compiler.

This file is the spec. When code and spec disagree, fix one of them in the same commit.

## Goals

- One set of threads per compiler, reused across calls.
- Any CommonJS module can be a target; no per-plugin thread script.
- The public API stays stateless: a call carries everything it needs, and any thread may run any call.
- The same code runs inline on the main thread when a call is not sent to a thread.
- Loader threads will use the same pool through its internal RPC jobs (`runJob` with `rpc`); they are not part of this API yet.

## Non-goals

- Threading the JavaScript parser, code generation or the module graph.
- Shared references and function handles in the public API.
- Pre-empting a running call. `end()` only rejects queued calls and terminates after a deadline.

## Terms

| Term        | Meaning                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| pool        | A `WorkerPool` on the main thread. Owns the queue and up to `max` threads.                                          |
| thread      | One `worker_threads.Worker` running `WorkerChild.js`. The pool's record of it is a `PoolWorker`.                    |
| child       | The `WorkerChild` inside a thread. Loads modules and answers calls.                                                 |
| call        | One request with a module, method and arguments; settled by one response.                                           |
| job         | The protocol message carrying one call to a thread (`JobMessage`); the pool bookkeeping calls the same unit a call. |
| worker      | What `compiler.worker(workerPath, options)` returns: a module bound to the pool.                                    |
| inline path | Running the method on the main thread instead of a thread.                                                          |

## Files

| File              | Holds                                                                        |
| ----------------- | ---------------------------------------------------------------------------- |
| `WorkerPlugin.js` | Sets up the farm for `experiments.threads`; warns without `worker_threads`.  |
| `WorkerFarm.js`   | The compiler's farm: lazily creates the pool and one facade per module path. |
| `WorkerPool.js`   | `WorkerPool`, the queue, scheduling, lifecycle and the inline path.          |
| `Worker.js`       | `Worker`: the module-bound facade.                                           |
| `WorkerChild.js`  | The thread entry. Never loaded on the main thread.                           |
| `protocol.js`     | Message typedefs, `WORKER_DATA_KIND`, `encodeError` / `decodeError`.         |

## Public API

```js
const worker = compiler.worker(require.resolve("./worker"));

await worker.run("minify", options);
```

| Member                                  | Behavior                                                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compiler.worker(workerPath, options?)` | Absolute path or `file:` URL, required. Returns the facade; without `experiments.threads` or `worker_threads`, its calls run directly on the main thread. |
| `worker.run(method, ...args)`           | One call.                                                                                                                                                 |

`options.numWorkers` asks for threads without `experiments.threads`, for work that ran on `jest-worker` before, such as minification:

```js
const worker = compiler.worker(require.resolve("./minify"), {
	numWorkers: os.availableParallelism() - 1
});

await worker.run("minify", options);
```

| `experiments.threads` | `numWorkers`   | Calls run on                                                      |
| --------------------- | -------------- | ----------------------------------------------------------------- |
| off                   | not set or `0` | the main thread, a plain call                                     |
| off                   | `n > 0`        | the shared pool, with up to `n` threads (capped at cores − 1)     |
| on                    | ignored        | the shared pool, with `threads.max` threads; `max: 0` runs inline |

Without `worker_threads`, every call runs on the main thread. A compiler can hold facades for both: with threads off, a facade made without `numWorkers` stays inline while one made with it runs on threads.

No `bind`, no `end`, no `warmup`, no `release`, no handles, no shared references: webpack owns the threads, so a plugin only runs calls. The pool's own `warmup()` and `release()` stay internal.

Coming from jest-worker: `numWorkers` and `threads.max` are its `numWorkers`. The facade has no `end()`: `compiler.close()` is what ends the pool.

New `options` fields reuse the `jest-worker` or `thread-loader` name for the same purpose; pool-wide settings stay in `experiments.threads`.

`compiler.worker` is a `Compiler` method:

- the farm is created once per `compiler.root`: when `experiments.threads` is on, or on the first `compiler.worker` call. It taps `compile`, `done`, `failed` and `watchClose` itself, so threads asked for with `numWorkers` follow the same lifecycle;
- child compilers return the root's facade;
- every threaded compiler of the process, `numWorkers` facades included, the compilers of a `MultiCompiler` included, shares one pool: cores are a process-wide budget, so a `MultiCompiler` that builds its configs at once still runs on at most `max` threads. The pool's `max` is the largest any of them asks for; it stays alive while any of them builds or watches, and ends when the last of them closes;
- a compiler with `max: 0`, threads off without `numWorkers`, or no `worker_threads` keeps its own inline pool;
- `compiler.close()` sets a closed flag immediately and, if it is the pool's last compiler, ends the pool before `shutdown`; an existing facade can still run calls until the pool ends;
- the farm is created on first use, so a plugin calls `compiler.worker` the same way whether threads are on or off, as it calls `getCache` whether caching is on or off;
- after `compiler.close()` starts, a farm whose pool was never created throws; otherwise the same facade is returned, and its calls reject because the pool ended.

## Usage

A plugin writes the work as a plain CommonJS module and runs it through the compiler. The code is the same whether threads are on or off.

```js
// minify-worker.js: every export is one callable task
const { minify } = require("some-minifier");

module.exports.minify = async (code, options) =>
	(await minify(code, options)).code;
```

```js
// MinifyPlugin.js
class MinifyPlugin {
	apply(compiler) {
		const { RawSource } = compiler.webpack.sources;
		compiler.hooks.thisCompilation.tap("MinifyPlugin", (compilation) => {
			compilation.hooks.processAssets.tapPromise(
				{
					name: "MinifyPlugin",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE
				},
				async (assets) => {
					// one facade per path; asking again returns the same one
					const worker = compiler.worker(require.resolve("./minify-worker"));
					const names = Object.keys(assets).filter((name) =>
						name.endsWith(".js")
					);
					await Promise.all(
						names.map(async (name) => {
							const code = await worker.run(
								"minify",
								assets[name].source().toString(),
								{ compress: true }
							);
							compilation.updateAsset(name, new RawSource(code));
						})
					);
				}
			);
		});
	}
}

module.exports = MinifyPlugin;
```

What the plugin does not do:

- create or end a pool: the compiler owns it and `compiler.close()` ends it;
- check `experiments.threads`: off, `run` is a direct call on the main thread;
- keep the facade between builds: `compiler.worker` returns the same one.

Reuse:

- One pool serves every module bound through `compiler.worker`, and any thread runs any module's task.
- From `compile` to `done` (or `failed`) idle threads stay alive. Tasks of one build reuse the same threads, whatever the gap between them (for example loaders in `make`, a minimizer in `processAssets`).
- In watch mode, threads stay alive between rebuilds however long the gap: spawning a thread and loading its modules costs far more than a call.
- To keep memory in check, each watch build ends by terminating the idle threads that ran nothing since the previous build ended. A rebuild that minifies one changed asset keeps one thread, not all of them. When no thread ran anything (every result came from cache), all stay: that build says nothing about how many are needed.
- Outside watch mode, and once watching closes, idle threads retire after their idle timeout. Idle threads never keep the process alive.

## Worker module contract

A target module is CommonJS. Each export called through the pool has the shape `(...args) => result | Promise<result>`.

- Arguments and results cross by structured clone: no functions, no class prototypes, no symbols.
- Each thread caches the module with `require`. Module-level caches may exist, but a result must not depend on which calls ran before it.
- A failed load stays failed on that thread for the pool's lifetime; a transient filesystem error is not retried.
- A call whose arguments cannot be cloned rejects with `WorkerJobCloneError` before its thread runs.
- Any call may run on any thread.
- Errors cross as `EncodedError` (`name`, `message`, `stack`, own enumerable `fields`). `decodeError` rebuilds a plain `Error`.

## Protocol

| Direction     | Message     | Fields                                  |
| ------------- | ----------- | --------------------------------------- |
| main → thread | `preload`   | `id`, `modules`                         |
| thread → main | `preloaded` | `id`, `ok`, `error?`                    |
| main → thread | `job`       | `id`, `module`, `method`, `args`, `rpc` |
| thread → main | `response`  | `id`, `ok`, `value` or `error`          |
| main → thread | `close`     | none                                    |

Ordering rules:

- The port delivers in order, so a `preload` posted before a `job` is seen first.
- The child requires modules on first use; a `job` does not wait for `preloaded`.
- A job whose response cannot be posted falls back to an error response carrying the clone failure.
- A loader job (`rpc: true`) may send `rpc` messages; the main thread answers with `rpc-result`.

## Scheduling

- One FIFO queue. `_dispatch` runs after every enqueue, settle, preload completion and exit.
- A thread runs at most one plain call and up to the pool's `loaderParallelJobs` (20) loader jobs at once; blocked jobs do not count against either limit.
- Among idle threads, the pool takes the last from its idle list (LIFO) whose last call ran the same module, or that ran none. Next comes one whose run of another module's calls is under 8. If none can take the call and fewer than `max` threads live, it spawns one.
- At `max`, when only idle threads that ran 8 or more calls of another module remain, the pool terminates one and a fresh thread takes the call once it exits. V8 sizes a thread's heap limit from the work it has done, so a thread one module grew lets the next module's garbage pile up: Stylelint then terser on three shared threads peaked 26% above jest-worker's separate pools, and replacing the threads brought the peak back to jest-worker's. The count of 8 bounds how many threads start when two modules' calls interleave.
- When every call on a thread waits on the main thread, that thread takes the next queued job of any type before a new one spawns: it cannot make progress itself. A plain call taken this way avoids a deadlock when an RPC handler calls back into the pool, and runs beside the loader jobs once they resume.
- That rule assumes a thread whose jobs are not all waiting makes progress. So a loader job must not await work owned by another job on the same thread, and an RPC handler that calls `run()` must not depend on another loader job in flight: the pool cannot see such a wait, and every job on the thread would stall.
- At `max`, a loader job goes to the thread with the fewest running loader jobs, up to its `parallelJobs`. These two loader-aware hooks (`blocked` and `parallelJobs`) are the deliberate price of one queue: split queues would lose the deterministic order above.
- A queued plain call keeps the head of the queue: when every thread is busy, later loader jobs wait even if a thread still has loader capacity. This is head-of-line blocking; one FIFO queue trades loader throughput for strict call order.
- When a call settles, its thread goes idle and dispatch continues.
- On exit, the thread is removed. Its in-flight call rejects with `Worker <id> exited with code <code> during <method>`. The next queued call spawns a replacement.
- A synchronous `postMessage` failure rejects that call; the thread stays usable.

## Lifecycle

- Spawn lazily from dispatch or `warmup`.
- While `setKeepAlive(true)` is on, idle threads start no idle timer; `setKeepAlive(false)` starts the timers again. `WorkerPlugin` turns it on at `compile`, off at `done` and `failed` outside watch mode, and off at `watchClose`.
- `markUnused()` starts a round; `releaseUnused()` retires idle threads that ran no call in it, unless none ran one. `WorkerPlugin` calls `releaseUnused()` then `markUnused()` when the last build of a round ends: with a shared pool, an earlier compiler's build end would retire threads a sibling used before it.
- An idle thread is released with `unref()` at once, so an idle pool never keeps the process alive, and starts an `idleTimeout` timer (itself released with `unref()`). A pending preload keeps the thread referenced and delays that timer.
- When it fires and the thread is still idle, the thread is terminated.
- Posting a call clears the timer and `ref()`s the thread.
- `release()` terminates idle threads and resolves after their threads exited; a busy thread or one with a pending preload is retired once it settles.
- `end()` closes a thread only when it has no calls and no preloads; a pending preload finishes or is rejected by the deadline.
- `end()` is idempotent:
  - sets the ending flag and rejects queued calls;
  - `ref()`s every thread and closes idle ones;
  - waits for in-flight calls, with a 1 second deadline after which the remaining threads are terminated;
  - resolves when every thread exited; in-flight calls reject through the normal exit path.
- `end()` resolves after every thread exited. Inline calls cannot be terminated, so an inline task that never settles also delays `end()`.
- `compiler.close()` ends the pool. Consumers never call `end()`.

## Inline path

A call runs inline when `max === 0`, or when a pool is used on a runtime without `worker_threads`.

Inline requires the module on the main thread, caches it, and calls the method. With `strictClone`, arguments and results go through `v8.serialize` / `v8.deserialize`, which approximates structured clone for the values tests cover; it does not model `MessagePort` or transfer. With threads on, the compiler passes `strictClone: true`, so inline calls (`max: 0`) reject values the thread path cannot clone. With threads off or without `worker_threads`, it passes `strictClone: false`: a call is a plain call, with no clone and no extra cost.

## Configuration

```js
module.exports = {
	experiments: {
		threads: {
			max: 4
		}
	}
};
```

| Value             | Effect                                                  |
| ----------------- | ------------------------------------------------------- |
| `false` (default) | Every call runs directly on the main thread.            |
| `true`            | `{ max: cores - 1 }`.                                   |
| `max: n`          | `min(floor(n), cores - 1)`; `0` runs every call inline. |

`cores` is `os.availableParallelism()` when available (Node 18.14+), else `os.cpus().length`, and `1` when `os.cpus()` returns nothing; the result is clamped to at least 0. This is how minimizer-webpack-plugin counts its `parallel` workers, so `max` never exceeds the cores either. Plain calls keep an idle thread for 30 seconds; RPC jobs use the pool's `loaderPoolTimeout` (500 ms). When `worker_threads` is unavailable, the compiler emits a warning on each compilation and `compiler.worker()` calls run directly on the main thread.

## First consumer

`minimizer-webpack-plugin` today builds a `jest-worker` pool per compilation. With the pool it binds `dist/minify.js` once per compiler, calls `run("minify", options)` or `run("transform", serialized)`, and warms up only the threads its asset count needs. That change lands in the plugin's repository; webpack only exposes `compiler.worker`.

Source maps were measured and rejected for the farm: shipping an asset's `Source` tree to a thread costs more on the main thread than composing its map in place. Work fits the pool when its compute per byte of input is high.
