"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
// TODO Bun drops a worker message posted before the listener attaches, when
// attachment is deferred past the worker's async-module startup (await import of
// the chunk); Node/browsers buffer it. Same root cause as node-worker-esm; the
// top-level await is the point of the case, so it stays skipped.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
