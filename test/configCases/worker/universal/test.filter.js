"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// universal worker resolves `worker_threads` via `process.getBuiltinModule` (Node >= 22.3)
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
