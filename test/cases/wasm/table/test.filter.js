"use strict";

const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

module.exports = () => supportsWebAssembly();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO JSC (Bun) WebAssembly table semantics differ from V8, so the table
// assertions fail; skip on Bun too.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
