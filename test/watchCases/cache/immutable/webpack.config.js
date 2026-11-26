"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: {
		type: "memory"
	},
	output: {
		filename: "bundle.js?[contenthash]"
	}
};
