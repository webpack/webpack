"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// universal worker resolves `worker_threads` via `process.getBuiltinModule` (Node >= 22.3)
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO Bun drops a worker message posted before the listener attaches: the
// universal worker attaches it inside `import("worker_threads").then(...)`, so
// it lands after async startup; Node/browsers buffer it. Same root cause as
// node-worker-esm.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
