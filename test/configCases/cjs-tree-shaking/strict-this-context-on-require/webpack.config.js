"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	module: {
		parser: {
			javascript: {
				strictThisContextOnImports: true
			}
		}
	},
	optimization: {
		minimize: false,
		usedExports: true,
		concatenateModules: false
	}
};
