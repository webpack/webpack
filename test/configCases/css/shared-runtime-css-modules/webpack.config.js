"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ target: "web", output: { module: false } },
	{ target: "web", output: { module: true } },
	{ target: ["web", "node"], output: { module: true } }
].map((options, index) => ({
	...options,
	mode: "development",
	devtool: false,
	entry: {
		main: "./index.js",
		other: "./feature.js"
	},
	experiments: { css: true },
	output: {
		...options.output,
		filename: `[name].${index}.${options.output.module ? "mjs" : "js"}`,
		chunkFilename: `[name].${index}.${options.output.module ? "mjs" : "js"}`,
		cssFilename: `[name].${index}.css`,
		cssChunkFilename: `[name].${index}.css`,
		publicPath: ""
	},
	optimization: {
		runtimeChunk: "single",
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				shared: {
					test: /shared\.module\.css$/,
					name: "shared",
					chunks: "all",
					enforce: true
				}
			}
		}
	}
}));
