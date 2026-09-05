"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	// Two async entry modules, so the one the bundle exports and the one it does not
	// are both awaited behind the chunk the split carries out of them.
	entry: { main: ["./a.js", "./b.js"] },
	output: {
		module: true,
		filename: "[name].mjs"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /shared\.js$/,
					name: "shared",
					chunks: "all",
					minSize: 0,
					enforce: true
				}
			}
		}
	}
};
