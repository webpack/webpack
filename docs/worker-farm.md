# Worker farm

`lib/util/worker/` runs CPU-heavy functions on `worker_threads`. One farm per compiler owns the threads, and every workload shares them: a thread is not tied to one module or one plugin.

This file is the spec. When code and spec disagree, fix one of them in the same commit.

## Goals

- One set of threads per compiler, reused across workloads, compilations and watch rebuilds.
- Any CommonJS module can be a target; no per-workload thread script.
- Calls in both directions, so a thread can ask the main thread for something (a resolver, a cache, a loader context) in the middle of a call.
- A value used by many calls (options, a large table) crosses the port once per thread, not once per call.
- The same code runs inline on the main thread when threads are unavailable or unwanted, with the same context shape.

## Non-goals

- Threading the JavaScript parser, code generation or the module graph. An AST costs more to transfer than to parse; the graph cannot be shared between isolates.
- Pre-empting a running call. Abort only drops a queued call or a result.
- Child processes. Only `worker_threads`.

## Terms

| Term             | Meaning                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| farm             | A `WorkerFarm`, on the main thread. Owns the queue and up to `max` threads.                         |
| thread           | One `worker_threads.Worker` running `child.js`. The farm's record of it is a `FarmWorker`.          |
| child            | The `WorkerChild` inside a thread. Loads modules and answers calls.                                 |
| target           | What a call runs: `{ module, method }` (absolute path and export name) or `{ handle }`.             |
| call             | One request with arguments; settled by one response.                                                |
| bound function   | What `farm.bind(target, options)` returns; its options fix the scheduling of every call through it. |
| shared reference | A number standing for a value pushed to each thread once, read back with `getSharedReference`.      |
| handle           | A token for a function one side exposed; the other side calls it with `{ handle }`.                 |
| inline path      | Running the target on the main thread with an inline context instead of a thread.                   |
| worker key       | A string from a bound function's `workerKey(args)`; equal keys go to the same thread when possible. |

## Files

| File          | Holds                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `farm.js`     | `WorkerFarm`, `getWorkerFarm(compiler)`, the queue, scheduling, lifecycle, the inline path.     |
| `child.js`    | `WorkerChild` and the thread entry. Never loaded on the main thread except for its JSDoc types. |
| `protocol.js` | Message typedefs, `MESSAGE_TYPE`, `TransferResult`, `encodeError` / `decodeError`.              |
| `handle.js`   | `Handle`.                                                                                       |

## Worker module contract

A target module is CommonJS. Each export called through the farm has the shape `(context, ...args) => result | Promise<result>`.

- `init(context)`, if exported, runs once per thread (and once inline) before the first call into that module, and is awaited.
- Module state lives as long as the thread. Different threads hold different copies; use `broadcast` to change all of them.
- Arguments and results cross by structured clone: no functions, no class prototypes (a class instance arrives as a plain object), no symbols. Pass a function as a handle (`expose`).
- A result wrapped by `context.transfer(value, buffers)` hands the buffers over instead of copying them. Only buffers the module allocated whole; a slice of a pooled `Buffer` must be copied.

### `WorkerContext`

Same shape on a thread and inline:

| Member                          | Thread                                         | Inline                      |
| ------------------------------- | ---------------------------------------------- | --------------------------- |
| `isWorker`                      | `true`                                         | `false`                     |
| `workerId`                      | id from `init`                                 | `undefined`                 |
| `getSharedReference(ref)`       | value the farm pushed                          | value as registered         |
| `callMain(target, args, opts?)` | `call` message to the main thread              | direct call                 |
| `callHandle(handle, args)`      | `callMain({ handle: handle.id }, args)`        | direct call                 |
| `expose(fn)`                    | registers in the child, `Handle(id, workerId)` | `farm.expose(fn)`           |
| `getLogger(name)`               | batched `log` messages                         | `farm.hooks.log` directly   |
| `transfer(value, buffers)`      | `TransferResult`                               | `TransferResult`, unwrapped |

`getSharedReference` throws for an unknown or disposed reference.

## Public API (`farm.js`)

```js
const farm = getWorkerFarm(compiler);
const minify = farm.bind(
	{ module: require.resolve("./minify"), method: "minify" },
	{ concurrency: 1, retries: 0, workerKey: undefined, inline: false }
);
const options = farm.share(minifyOptions);
const result = await minify([asset, options.ref], { transfer, signal });
await options.dispose();
```

| Member                              | Behavior                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bind(target, options?)`            | Returns a `RemoteFunction`. Options merged over `{ concurrency: 1, retries: 0, inline: false }` once, at bind time.                                                          |
| `run(target, args, options?)`       | One call; options are bind and call options together.                                                                                                                        |
| `share(value, options?)`            | Registers the value under the next reference number. Pushed to a thread before the first call sent there after registration, not eagerly.                                    |
| `SharedReference.dispose()`         | Removes the entry, posts `unshare` to every thread it was pushed to, resolves at once. Later calls reading it throw.                                                         |
| `expose(fn)`                        | Registers a main-thread function; returns `new Handle(id, undefined)`. Lives until `end`.                                                                                    |
| `broadcast(target, args)`           | Calls a `{ module, method }` target on every live thread, beside their other calls, and inline if the inline path already loaded its module. Rejects with the first failure. |
| `warmup(modules)`                   | Spawns threads up to `max`, each preloading `modules` before `ready`; resolves when all are ready. Live threads are left as they are. Inline: resolves at once.              |
| `stats`                             | `FarmStats` computed from the live records and counters.                                                                                                                     |
| `end(options?)`                     | See [Lifecycle](#lifecycle). Idempotent: later calls return the same promise.                                                                                                |
| `hooks.workerSpawned`               | `(workerId)` after a thread is created.                                                                                                                                      |
| `hooks.workerExited`                | `(workerId, exitCode)` after its record is removed.                                                                                                                          |
| `hooks.log`                         | `(name, type, args)` for each log entry, from threads and inline.                                                                                                            |
| `WorkerFarm.isThreadingAvailable()` | Whether `require("worker_threads")` succeeds.                                                                                                                                |

### `getWorkerFarm(compiler)`

Factory lookup, not constructor injection: a consumer calls it where it needs the farm.

- Keyed by `compiler.root` in a module-level `WeakMap`, so child compilers share the root's farm.
- Created on first call with options from the `threads` option (see [Configuration](#configuration)).
- On creation it taps `compiler.root.hooks.shutdown` to `end()` the farm and delete the entry, and taps `farm.hooks.log` into the root's `infrastructureLog` hook and `infrastructureLogger`, the way `getInfrastructureLogger` does.

## Protocol (`protocol.js`)

One channel per thread, the one `new Worker` creates. Every message is a plain object with a `type` from `MESSAGE_TYPE`.

| Direction     | Message    | Fields                         | When                                                     |
| ------------- | ---------- | ------------------------------ | -------------------------------------------------------- |
| main → thread | `init`     | `workerId`, `preload`          | First message, right after spawn.                        |
| main → thread | `share`    | `ref`, `encoding`, `value`     | Before the first call on that thread after registration. |
| main → thread | `unshare`  | `ref`                          | On dispose, to threads that received the `share`.        |
| main → thread | `close`    | none                           | Graceful end, after the thread has nothing in flight.    |
| thread → main | `ready`    | `workerId`                     | After `init` and every preload finished.                 |
| thread → main | `log`      | `entries`                      | Batched; see [Logging](#logging).                        |
| both          | `call`     | `id?`, `target`, `args`        | `id` absent: no response wanted.                         |
| both          | `response` | `id`, `ok`, `value` or `error` | Exactly one per `call` with an `id`.                     |

Ordering rules:

- Each side numbers its own calls from 1; a response's `id` refers to a call the receiver sent. The two numberings never mix.
- The port delivers in order, so a `share` posted before a `call` is seen first. The farm does not wait for `ready` before posting calls.
- The child handles `init` before anything else: every later message waits on the init promise. Without that, a call could reach a module whose preload has not finished.
- A call whose `id` is absent gets no response, even on error; the error is logged as an `error` entry instead.

Errors cross as `EncodedError` (`name`, `message`, `stack`, own enumerable `fields`, the `workerId` it was thrown in). `decodeError` rebuilds a plain `Error`; the class is not preserved.

## Scheduling

The farm keeps one FIFO (first in, first out) queue. `_dispatch` runs after every enqueue, settle and exit, and drains the queue until no call can be placed:

1. Pick a thread for the head call (`_pickWorker`).
2. If none can take it and fewer than `max` threads live, spawn one and pick again.
3. Otherwise stop; the next settle or exit resumes.

A thread can take a call when its in-flight count is below the **smallest** `concurrency` among the new call and every call already in flight there. So a `concurrency: 1` call never shares a thread, whatever is bound with a higher limit.

Among threads that can take the call:

1. The thread its worker key last went to, if it still lives.
2. Else a thread with nothing in flight.
3. Else any thread that can take it.

The worker key is a preference, never a wait: a busy preferred thread does not hold the call back. The map from key to thread drops the thread on exit.

A call with `signal`:

- Already aborted: rejects with `AbortError` without enqueuing.
- Aborted while queued: removed from the queue and rejected.
- Aborted while running: rejected at once; the response is ignored when it arrives.

`postMessage` throws synchronously (`DataCloneError`) for an argument structured clone cannot copy. That call is rejected and taken back out of `inFlight`; dispatch goes on with the next.

## Lifecycle

**Spawn.** Lazily, from dispatch or `warmup`. `new Worker(child.js, { workerData: { kind, workerId }, resourceLimits })`. `execArgv` is left to Node, which passes on the parent's flags a thread accepts; an explicit list containing a per-process flag such as `--max-old-space-size` makes `new Worker` throw. Then `init` is posted. A thread with nothing in flight idles once it is `ready`.

**Idle.** A thread with nothing in flight is released with `unref()` at once, so an idle farm never keeps the process alive, and starts an `idleTimeout` timer (itself released with `unref()`) unless the farm is at `min` threads. When the timer fires and the thread is still idle, it is terminated. Posting a call clears the timer and `ref()`s the thread.

**Crash.** On `exit` the record is removed. Each in-flight call is requeued at the head while its `retries` is below the bound function's `retries`, else rejected with `Worker <id> exited with code <code> during <method>`, plus the thread's `error` if it emitted one. `_crashed` counts exits with calls in flight. Dispatch then resumes, spawning a replacement if the queue needs one.

**End.**

- Sets `_ending`. Every new call is rejected with `The farm is ending`.
- Queued calls are rejected with the same error.
- Without `force`: waits until no thread has calls in flight, then posts `close`. The child flushes its log batch and closes its port; the thread exits on its own.
- Every thread is held with `ref()` until it exits, so the process waits for `end` (the compiler's cache shutdown runs after it).
- With `force`: terminates every thread; in-flight calls are rejected through the normal exit path. While ending, no call is retried.
- Resolves when every thread has exited. Clears exposed handles, shared entries and the worker key map.

## Inline path

A call runs inline when any of these holds:

- `max === 0`
- the bound function or the call says `inline: true`
- `worker_threads` is unavailable (Node below 12 without the flag)

Inline, the farm requires the module itself (cached per path), runs `init` once and calls the method with the inline context.

With `strictClone`, arguments and results go through `v8.serialize` / `v8.deserialize`, so a value that would fail the port fails inline too. Inline is the correctness oracle: a test can run the same workload both ways and compare results.

## Encoding

Structured clone is the only encoding implemented. The `"webpack"` encoding (`buffersSerializer`, for classes registered with `makeSerializable`) is reserved in the typedefs: `buffersSerializer` serializes asynchronously, so it needs `share` to resolve after encoding, a change to decide when the first consumer needs it ([Open questions](#open-questions)).

## Logging

`context.getLogger(name)` returns a webpack `Logger`. On a thread, each entry (`name`, `type`, `args`) is appended to a batch. The batch is posted as one `log` message:

- before every `response`, so a call's log lines arrive before its result
- on `setImmediate` after the first entry of a batch, for long calls
- on `close`

The farm replays each entry on `hooks.log`; `getWorkerFarm` forwards it to the compiler's infrastructure logger.

## Configuration

A top-level `threads` option (`parallelism` is taken: it limits concurrent module builds).

| Value                | Farm options                                        |
| -------------------- | --------------------------------------------------- |
| `undefined` / `true` | `max: cores - 1`                                    |
| `false` / `0`        | `max: 0`, everything inline                         |
| number `n`           | `max: n`                                            |
| object               | `{ max, min, idleTimeout }` with the above defaults |

Defaults: `min: 0`, `idleTimeout: 30000`, `strictClone: false`. `cores` is `os.cpus().length`, as in `minimizer-webpack-plugin`.

## First consumer

`minimizer-webpack-plugin` (webpack org) today builds a `jest-worker` pool per compilation and ends it after the assets are minified. With the farm it binds `dist/minify.js` once per compiler, shares the minimizer options once per compilation, and never ends the farm itself. That change lands in the plugin's repository; webpack only exposes `getWorkerFarm`.

Loaders on threads come later: they need `callMain` and handles for the loader context.

## Open questions

1. `encoding: "webpack"`: make `share` return `Promise<SharedReference>`, or keep `share` synchronous and encode on first push?
2. Expose `getWorkerFarm` as `compiler.webpack.util.getWorkerFarm`, or as a `Compiler` method?
3. `idleTimeout` default: 30 s keeps threads warm across typical watch rebuilds; shorter frees memory sooner.
4. Handles live until `end`. A long watch session that exposes per compilation needs a `release`; add it with the first such consumer.
