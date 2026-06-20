"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// ESM output runs via `--experimental-vm-modules` (Node >= 12) and the
// universal worker resolves `worker_threads` via `process.getBuiltinModule`
// (Node >= 22.3).
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's ESM worker output; the panic aborts the process and
// cannot be caught, so skip the case under Deno.
// TODO Bun hangs here (same root cause as worker/node-worker-esm): a message
// queued while webpack's import() worker chunk loading is in flight stalls Bun's
// event loop, so the worker never attaches its listener; Node buffers it.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
