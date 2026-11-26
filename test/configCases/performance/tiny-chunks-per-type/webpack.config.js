"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		splitChunks: {
			minSize: {
				javascript: 1
			}
		}
	},
	performance: {
		hints: "warning",
		tinyChunks: true
	}
};
