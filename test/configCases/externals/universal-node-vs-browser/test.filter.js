"use strict";

const supportsProcessGetBuiltinModule = require("../../../helpers/supportsProcessGetBuiltinModule");

// node-commonjs externals load via process.getBuiltinModule (node 22.3+)
module.exports = () => supportsProcessGetBuiltinModule();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
