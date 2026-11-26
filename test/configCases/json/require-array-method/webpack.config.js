"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: {
		usedExports: true,
		sideEffects: false,
		minimize: false
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
