"use strict";

// Bun only binds CJS `require` for `eval()` in strict mode; the minified
// eval-devtool chunk is sloppy at the top level and reaches the `worker_threads`
// external via `require` inside `eval`, so only the minimize+eval variant throws
// "require is not defined" — every other variant runs fine under Bun.
module.exports = (config) =>
	!(
		process.versions.bun &&
		config &&
		config.minimize &&
		typeof config.devtool === "string" &&
		config.devtool.includes("eval")
	);
