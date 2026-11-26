"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		pathinfo: false
	},
	optimization: {
		moduleIds: "named",
		concatenateModules: false,
		inlineExports: true,
		minimize: false
	}
};
