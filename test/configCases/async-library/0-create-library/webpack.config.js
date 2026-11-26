"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	entry: "./a.js",
	output: {
		module: true,
		filename: "lib.js",
		library: {
			type: "module"
		}
	},
	target: "node14",
	optimization: {
		minimize: true
	}
};
