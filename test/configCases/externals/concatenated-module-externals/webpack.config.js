"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: { module: true },
	mode: "production",
	target: "async-node",
	externalsType: "module",
	externals: {
		fs: "module fs"
	},
	optimization: {
		concatenateModules: true,
		minimize: false
	}
};
