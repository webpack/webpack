"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	optimization: {
		concatenateModules: true,
		minimize: false
	},
	output: {
		module: true,
		chunkFormat: "module"
	}
};
