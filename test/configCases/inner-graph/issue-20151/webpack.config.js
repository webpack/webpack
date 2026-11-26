"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "node14",
	optimization: {
		minimize: false,
		mangleExports: false,
		concatenateModules: false,
		emitOnErrors: true
	},
	output: {
		module: true
	},
	externals: ["acorn"]
};
