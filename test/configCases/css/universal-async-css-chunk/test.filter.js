"use strict";

const supportsGlobalThis = require("../../../helpers/supportsGlobalThis");

// the SSR style registry is exposed on globalThis (node 12+)
module.exports = () => supportsGlobalThis();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
