"use strict";

const supportsResponse = require("../../../helpers/supportsResponse");
const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

// async wasm output is an async module (top-level await) and the web path
// needs `Response`; both require a modern Node.js
module.exports = () => supportsWebAssembly() && supportsResponse();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
