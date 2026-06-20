"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

module.exports = () => supportsRequireInModule();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
// TODO Bun's dynamic import of node builtins and its repl differ from Node here,
// so the executed-case assertions fail.
module.exports = (...args) =>
	!process.versions.deno && !process.versions.bun && _denoOrigFilter(...args);
