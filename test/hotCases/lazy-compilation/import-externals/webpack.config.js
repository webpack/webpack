"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	externals: {
		util: "util"
	},
	externalsType: "import",
	experiments: {
		outputModule: true,
		lazyCompilation: {
			entries: false
		}
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		enabledLibraryTypes: ["module"]
	},
	optimization: {
		minimize: false
	}
};
