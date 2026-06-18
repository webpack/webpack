"use strict";

const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

// `output.module` here emits `import { createRequire } from "module"`,
// which older Node versions can't link in the vm ESM runner
module.exports = () => supportsRequireInModule();

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
