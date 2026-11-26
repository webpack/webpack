"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	entry: "./index.js",
	optimization: {
		minimize: false,
		moduleIds: "named",
		usedExports: true,
		providedExports: true,
		concatenateModules: false
	}
};
