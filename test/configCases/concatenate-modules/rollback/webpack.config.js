"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	entry: ["./index.js", "./blocker.js"],
	optimization: {
		concatenateModules: true,
		inlineExports: false,
		minimize: false,
		moduleIds: "named"
	}
};
