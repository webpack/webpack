"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

module.exports = (config) => !config.module || supportsRequireInModule();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
