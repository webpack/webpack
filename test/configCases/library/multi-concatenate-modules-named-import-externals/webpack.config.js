"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	cache: {
		type: "memory" // Enable memory cache to test serialization
	},
	target: "node",
	mode: "none",
	entry: { main: "./index.js", test: "./other-entry.js" },
	output: {
		module: true,
		library: {
			type: "modern-module"
		},
		filename: "[name].mjs",
		chunkFormat: "module"
	},
	resolve: {
		extensions: [".js"]
	},
	externalsType: "module",
	externals: {
		"externals-1/foo": "fs",
		"externals-2/foo": "graceful-fs"
	},
	optimization: {
		concatenateModules: true,
		usedExports: true
	}
};
