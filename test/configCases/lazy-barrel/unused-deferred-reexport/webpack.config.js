"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		deferImport: true
	},
	optimization: {
		sideEffects: true,
		concatenateModules: false
	}
};
