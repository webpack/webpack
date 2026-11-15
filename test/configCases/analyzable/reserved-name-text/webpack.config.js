"use strict";

// The fill pass of ESM output replaces reserved names by a text search over
// every asset, so bundled data spelling one has to reach the bundle escaped.

/**
 * @param {"production" | "development"} mode the mode
 * @returns {import("../../../../").Configuration} the configuration
 */
const config = (mode) => ({
	target: "node",
	mode,
	devtool: false,
	module: {
		rules: [
			{ test: /\.txt$/, type: "asset/source" },
			{
				test: /style\.css$/,
				type: "css/auto",
				parser: { exportType: "text" }
			},
			{ scheme: "data", type: "asset/inline" }
		]
	},
	output: {
		module: true,
		chunkFilename: `[name].${mode}.[contenthash].mjs`
	},
	optimization: { chunkIds: "named", minimize: false },
	experiments: { css: true }
});

// Production concatenates the modules, development keeps each one apart.
module.exports = [config("production"), config("development")];
