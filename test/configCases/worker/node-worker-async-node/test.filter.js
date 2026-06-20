"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
// TODO Bun hangs here (same root cause as worker/node-worker-esm): a message
// queued while webpack's import() worker chunk loading is in flight stalls Bun's
// event loop, so the worker never attaches its listener (flaky under the cache
// variant); Node buffers it.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
