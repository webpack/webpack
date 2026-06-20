"use strict";

const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

// Native dynamic `import("./mod.wasm")` — used here as the Node.js reference
// via `webpackIgnore: true` — became available in Node.js v22 (still emits an
// experimental warning, but works without `--experimental-wasm-modules`).
module.exports = () => {
	if (!supportsWebAssembly()) return false;
	const [major] = process.versions.node.split(".").map(Number);
	return major >= 22;
};

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
