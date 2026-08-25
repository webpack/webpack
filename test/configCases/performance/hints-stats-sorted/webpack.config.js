"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		unusedConfig: true,
		// Any bundle exceeds this, so the size hints always fire.
		maxAssetSize: 1,
		maxEntrypointSize: 1
	},
	module: {
		rules: [
			{ test: /\.js$/, use: [] },
			{ test: /\.never-matches$/, loader: "./loader" }
		]
	}
};
