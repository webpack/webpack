"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

// universal worker resolves `worker_threads` via `process.getBuiltinModule` (Node >= 22.3)
module.exports = () =>
	supportsWorker() && typeof process.getBuiltinModule === "function";

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO Bun's Worker does not run the emitted worker chunk to completion here,
// so the case hangs until the jest timeout; skip under Bun.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
