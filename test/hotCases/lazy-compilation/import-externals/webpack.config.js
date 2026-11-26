"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	externals: {
		util: "util"
	},
	externalsType: "import",
	experiments: {
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
