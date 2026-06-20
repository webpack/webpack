"use strict";

const supportsBlob = require("../../../helpers/supportsBlob");
const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker() && supportsBlob();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
// TODO Bun hard-aborts (SIGABRT in JSC) loading a chunk from a `blob:` URL
// Worker; the crash kills the whole run, so skip it under Bun too.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
