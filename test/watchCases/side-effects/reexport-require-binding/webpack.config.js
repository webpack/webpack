"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [{ test: /target\.js$/, sideEffects: false }]
	},
	optimization: {
		concatenateModules: false,
		mangleExports: false,
		minimize: false,
		moduleIds: "named"
	}
};
