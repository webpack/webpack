"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	performance: {
		hints: "warning"
	},
	stats: {
		hash: false,
		colors: true
	}
};
