"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	optimization: {
		sideEffects: true,
		providedExports: false,
		concatenateModules: false
	}
};
