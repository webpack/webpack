"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		hash: false,
		moduleTrace: false,
		errorDetails: false
	}
};
