"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	experiments: {
		css: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	}
};
