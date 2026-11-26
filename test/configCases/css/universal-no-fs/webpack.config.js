"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	target: ["web", "node"],
	mode: "development",
	experiments: {
		css: true
	},
	output: {
		module: true,
		uniqueName: "universal-no-fs"
	}
};
