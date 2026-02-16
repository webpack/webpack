"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	entry: {
		app: "./app.js",
		"my-worker": "./worker.js"
	},
	output: {
		filename: "[name].js"
	},
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
