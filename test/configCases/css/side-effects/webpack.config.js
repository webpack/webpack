"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	experiments: { css: true },
	output: {
		cssFilename: "bundle0.css"
	},
	optimization: {
		sideEffects: true,
		moduleIds: "named",
		chunkIds: "named",
		concatenateModules: false,
		minimize: false
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
