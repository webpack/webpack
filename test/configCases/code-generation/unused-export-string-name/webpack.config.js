"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	optimization: {
		usedExports: true,
		concatenateModules: false
	}
};
