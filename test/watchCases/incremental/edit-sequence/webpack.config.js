"use strict";

/** @returns {import("../../../..").Configuration[]} watch configurations */
module.exports = () =>
	["development", "production"].map((mode, index) => ({
		mode: /** @type {"development" | "production"} */ (mode),
		devtool: false,
		cache: { type: index === 0 ? "memory" : "filesystem" },
		output: {
			clean: false,
			pathinfo: false,
			filename: `bundle${index}.js`,
			library: { type: "commonjs2" }
		},
		optimization: { minimize: false, moduleIds: "named", chunkIds: "named" }
	}));
