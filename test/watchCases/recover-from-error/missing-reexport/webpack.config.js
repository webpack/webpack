"use strict";

/** @type {import("../../../..").Configuration[]} */
module.exports = /** @type {const} */ (["memory", "filesystem"]).map(
	(type, index) => ({
		mode: "production",
		cache: { type },
		devtool: false,
		output: { filename: `bundle${index}.js`, clean: false },
		optimization: {
			minimize: false,
			concatenateModules: false,
			emitOnErrors: true
		},
		stats: { providedExports: true }
	})
);
