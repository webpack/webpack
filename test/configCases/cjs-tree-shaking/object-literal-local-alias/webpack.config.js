"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	optimization: {
		minimize: false,
		usedExports: true,
		concatenateModules: false
	}
};
