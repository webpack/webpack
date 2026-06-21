"use strict";

const supportsBlob = require("../../../helpers/supportsBlob");
const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker() && supportsBlob();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
