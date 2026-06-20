"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO Bun drops a worker message posted before the listener attaches, when
// attachment is deferred past the worker's async-module startup (await import of
// the chunk); Node/browsers buffer it. Reproduces outside jest. Attaching the
// listener first works but removes this case's top-level-await worker coverage.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
