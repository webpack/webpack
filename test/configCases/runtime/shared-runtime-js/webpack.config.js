"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ target: "web", output: { module: false } },
	{ target: "web", output: { module: true } },
	{ target: ["web", "node"], output: { module: true } },
	{ target: "node", output: { module: false } },
	{ target: "node", output: { module: true } },
	{ target: "webworker", output: { module: false } }
].map((options, index) => ({
	...options,
	mode: "development",
	devtool: false,
	entry: {
		main: "./index.js",
		other: "./feature.js"
	},
	output: {
		...options.output,
		filename: `[name].${index}.${options.output.module ? "mjs" : "js"}`,
		chunkFilename: `[name].${index}.${options.output.module ? "mjs" : "js"}`
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				shared: {
					test: /shared\.js$/,
					name: "shared",
					chunks: "all",
					enforce: true
				}
			}
		}
	}
}));
