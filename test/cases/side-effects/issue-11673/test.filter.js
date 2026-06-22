"use strict";

const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker();

const _origFilter = module.exports;

// Bun only binds CJS `require` for `eval()` in strict mode; the minified
// eval-devtool chunk is sloppy at the top level and reaches the `worker_threads`
// external via `require` inside `eval`, so only that variant throws "require is
// not defined" — every other variant runs fine under Bun.
module.exports = (config) => {
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
