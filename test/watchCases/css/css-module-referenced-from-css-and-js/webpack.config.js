"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	cache: {
		type: "memory",
		cacheUnaffected: true
	},
	output: {
		cssFilename: "[name].css"
	},
	experiments: {
		css: true,
		cacheUnaffected: true
	}
};
