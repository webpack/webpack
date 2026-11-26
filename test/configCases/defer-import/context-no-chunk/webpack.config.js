"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "node",
	output: {
		chunkLoading: false
	},
	optimization: {
		concatenateModules: false
	},
	experiments: {
		deferImport: true
	}
};
