"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	entry: "./index.js",
	output: {
		filename: "[name].js",
		chunkLoading: "require",
		pathinfo: false
	},
	optimization: {
		// keep the payload a separate module in its own chunk so the minifier
		// sees its exported function escape in isolation (as in the real bug)
		concatenateModules: false,
		moduleIds: "named",
		minimize: true,
		splitChunks: {
			cacheGroups: {
				payload: {
					test: /payload/,
					name: "payload",
					chunks: "all",
					enforce: true
				}
			}
		}
	}
};
