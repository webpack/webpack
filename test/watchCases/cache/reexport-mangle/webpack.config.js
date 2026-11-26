"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: {
		type: "memory"
	},
	output: {
		pathinfo: true
	},
	optimization: {
		minimize: false,
		concatenateModules: false
	}
};
