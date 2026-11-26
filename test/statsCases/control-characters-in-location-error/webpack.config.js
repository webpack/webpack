"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: {
		"missing\u001B[3mITALIC": "./missing.js"
	},
	stats: {
		errorDetails: false
	}
};
