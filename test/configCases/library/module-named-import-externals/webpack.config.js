"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	entry: { main: "./index.js" },
	output: {
		module: true,
		library: {
			type: "module"
		},
		filename: "[name].mjs",
		chunkFormat: "module"
	},
	resolve: {
		extensions: [".js"]
	},
	externals: ["fs", "path"],
	externalsType: "module",
	optimization: {
		concatenateModules: true,
		usedExports: true
	}
};
