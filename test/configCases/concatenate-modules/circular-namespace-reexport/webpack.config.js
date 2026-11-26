"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		moduleIds: "named"
	}
};
