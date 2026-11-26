"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	entry: "./index.mjs",
	optimization: {
		moduleIds: "named"
	},
	module: {
		parser: {
			javascript: {
				createRequire: true
			},
			"javascript/esm": {
				commonjs: false,
				createRequire: true
			}
		}
	}
};
