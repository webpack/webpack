"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	performance: {
		hints: "stats",
		pureAnnotations: true
	}
};
