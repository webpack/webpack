"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	},
	externalsType: "module",
	externals: { "./library.mjs": "./library.mjs" },
	optimization: {
		concatenateModules: false,
		// A chunk of its own takes the module out of the one declaring the binding
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /shared\.js/,
					name: "shared",
					chunks: "all",
					enforce: true
				}
			}
		}
	},
	performance: { hints: "warning", analyzableBailouts: true }
};
