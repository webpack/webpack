# Worker pool

`lib/worker/` runs CPU-heavy plugin work on `worker_threads`. One pool per compiler root owns the threads, and `compiler.worker(workerPath, options)` binds a module to the pool. A thread is not tied to one module or one call.

This file is the spec. When code and spec disagree, fix one of them in the same commit.

## Goals

- One set of threads per compiler, reused across calls.
- Any CommonJS module can be a target; no per-plugin thread script.
- The public API stays stateless: a call carries everything it needs, and any thread may run any call.
- The same code runs inline on the main thread when threads are unavailable or unwanted.
- Loader threads use the same pool; they add a private RPC context on top of it.

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

| File             | Holds                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| `WorkerFarm.js`  | The compiler's farm: lazily creates the pool and one facade per module path. |
| `WorkerPool.js`  | `WorkerPool`, the queue, scheduling, lifecycle and the inline path.          |
| `Worker.js`      | `Worker`: the module-bound facade.                                           |
| `WorkerChild.js` | The thread entry. Never loaded on the main thread.                           |
| `protocol.js`    | Message typedefs, `WORKER_DATA_KIND`, `encodeError` / `decodeError`.         |

## Public API

```js
const worker = compiler.worker(require.resolve("./worker"));

await worker.run("minify", options);
await worker.warmup(4);
await worker.release();
```

| Member                                  | Behavior                                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `compiler.worker(workerPath, options?)` | Absolute path or `file:` URL, required. Returns the facade; throws when `experiments.threads` is off.                      |
| `worker.run(method, ...args)`           | One call.                                                                                                                  |
| `worker.warmup(workers?)`               | Spawns up to `workers` threads and preloads this module; defaults to the pool's `max`. Existing threads are preloaded too. |
| `worker.release()`                      | Terminates idle threads in the shared pool. Calls in flight finish, then their threads retire; the pool stays usable.      |

`workerPath` may be followed by a reserved `options` argument: no field is used yet, so passing one is accepted and ignored.

No `bind`, no `end`, no handles, no shared references. `release()` affects the shared pool, including threads another consumer warmed up.

Coming from thread-loader or jest-worker: `threads.max` is their `workers` / `numWorkers`, `loaders.parallelJobs` is `workerParallelJobs`, and `loaders.poolTimeout` is `poolTimeout`. The facade has no `end()`: `release()` retires idle threads and leaves the pool usable, while `compiler.close()` is what ends it.

When `options` fields ship, they reuse the `jest-worker` or `thread-loader` name for the same purpose; pool-wide settings stay in `experiments.threads`.

`compiler.worker` is a `Compiler` method:

- the farm is created once per `compiler.root` when `experiments.threads` is on;
- child compilers return the root's facade;
- each compiler of a `MultiCompiler` is its own root, so every config gets its own pool;
- `compiler.close()` sets a closed flag and ends the pool before `shutdown`;
- after close, a farm whose pool was never created throws; otherwise the same ended facade is returned, whose calls reject.

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
- Each thread runs one plain call at a time, or up to `loaders.parallelJobs` loader jobs.
- Among idle threads, the pool takes the last from its idle list (LIFO). If none can take the call and fewer than `max` threads live, it spawns one.
- When every call on a thread waits on the main thread, that thread takes the next job before a new one spawns: it cannot make progress itself.
- At `max`, a loader job goes to the thread with the fewest running loader jobs, up to its `parallelJobs`. These two loader-aware hooks (`blocked` and `parallelJobs`) are the deliberate price of one queue: split queues would lose the deterministic order above.
- A queued plain call keeps the head of the queue: when every thread is busy, later loader jobs wait even if a thread still has loader capacity. This is head-of-line blocking; one FIFO queue trades loader throughput for strict call order.
- When a call settles, its thread goes idle and dispatch continues.
- On exit, the thread is removed. Its in-flight call rejects with `Worker <id> exited with code <code> during <method>`. The next queued call spawns a replacement.
- A synchronous `postMessage` failure rejects that call; the thread stays usable.

## Lifecycle

- Spawn lazily from dispatch or `warmup`.
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

A call runs inline when `max === 0` or `worker_threads` is unavailable.

Inline requires the module on the main thread, caches it, and calls the method. With `strictClone`, arguments and results go through `v8.serialize` / `v8.deserialize`, which approximates structured clone for the values tests cover; it does not model `MessagePort` or transfer. The compiler passes `strictClone: true`, so inline calls reject values the thread path cannot clone. Loader jobs are unaffected: a loader chain that cannot run in a worker falls back to `runLocal`.

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
	}
};
```

| Value             | Effect                                       |
| ----------------- | -------------------------------------------- |
| `false` (default) | No pool; `compiler.worker` throws.           |
| `true`            | `{ max: cores - 1 }`.                        |
| `max: n`          | `Math.floor(n)`; `0` runs every call inline. |

`cores` is `os.availableParallelism()` when available, else `os.cpus().length`; the result is clamped to at least 0. `max` is shared with loader threads. Plain calls keep an idle thread for 30 seconds; loader jobs use `loaders.poolTimeout` (default 500 ms).

## First consumer

`minimizer-webpack-plugin` today builds a `jest-worker` pool per compilation. With the pool it binds `dist/minify.js` once per compiler, calls `run("minify", options)` or `run("transform", serialized)`, and warms up only the threads its asset count needs. That change lands in the plugin's repository; webpack only exposes `compiler.worker`.

Source maps were measured and rejected for the farm: shipping an asset's `Source` tree to a thread costs more on the main thread than composing its map in place. Work fits the pool when its compute per byte of input is high.

Loader threads share the same pool. Their contract is in [Loader threads](./loader-threads.md).
