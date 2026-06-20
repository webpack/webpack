"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
// TODO Bun's Worker does not run the emitted worker chunk to completion here, so
// the case hangs until the jest timeout (flaky under the cache variant); skip
// under Bun.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
