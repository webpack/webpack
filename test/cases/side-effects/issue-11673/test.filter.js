"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO Bun leaves `require` undefined in the eval'd minimized+source-map worker
// chunk, so executing the emitted bundle throws "require is not defined".
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
