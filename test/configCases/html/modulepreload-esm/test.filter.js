"use strict";

// Tests use `import.meta.url` to locate emitted chunks at runtime and
// `globalThis` in fixtures, both of which require Node 12+.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	// the es2022 snapshot uses `Object.hasOwn`, available since Node 16.9
	return major >= 12 && typeof Object.hasOwn === "function";
};

const _denoOrigFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process and cannot be
// caught, so skip the case under Deno.
module.exports = (...args) =>
	!process.versions.deno && _denoOrigFilter(...args);
