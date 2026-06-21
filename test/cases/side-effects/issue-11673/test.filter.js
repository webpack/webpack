"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker();

const _origFilter = module.exports;

// Deno 2.8.3 hard-panics ("Module not found", bindings.rs) instead of throwing
// when executing this case's output; the panic aborts the process, so skip Deno.
// Bun only binds CJS `require` for `eval()` in strict mode; the minified
// eval-devtool chunk is sloppy at the top level and reaches the `worker_threads`
// external via `require` inside `eval`, so only that variant throws "require is
// not defined" — every other variant runs fine under Bun.
module.exports = (config) => {
	if (process.versions.deno) return false;
	if (
		process.versions.bun &&
		config &&
		config.minimize &&
		typeof config.devtool === "string" &&
		config.devtool.includes("eval")
	) {
		return false;
	}
	return _origFilter(config);
};
