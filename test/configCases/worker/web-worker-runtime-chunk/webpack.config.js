"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	optimization: {
		runtimeChunk: { name: "runtime" },
		splitChunks: {
			cacheGroups: {
				vendor: {
					test(mod) {
						return mod.context && mod.context.includes("node_modules");
					},
					chunks: "all",
					name: "vendor",
					priority: 10,
					enforce: true
				}
			}
		}
	}
};
