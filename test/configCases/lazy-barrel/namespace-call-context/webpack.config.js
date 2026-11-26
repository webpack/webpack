"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	module: {
		parser: {
			javascript: {
				strictThisContextOnImports: true
			}
		}
	},
	optimization: {
		sideEffects: true,
		usedExports: true,
		concatenateModules: false
	}
};
