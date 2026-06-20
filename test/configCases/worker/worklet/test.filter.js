"use strict";

const supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");
const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker() && supportsOptionalChaining();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 runs this case differently than Node (worker execution or
// emitted output differs), so skip it under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
