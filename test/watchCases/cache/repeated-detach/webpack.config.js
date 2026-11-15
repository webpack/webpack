"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = ["development", "production"].map((mode, index) => ({
	mode: /** @type {"development" | "production"} */ (mode),
	cache: { type: index === 0 ? "memory" : "filesystem" },
	output: {
		clean: false,
		filename: `bundle${index}.js`,
		chunkFilename: `${index}-[name].js`
	},
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" }
}));
