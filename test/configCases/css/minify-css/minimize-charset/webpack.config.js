"use strict";

/** @import { Configuration } from "../../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: {
			css: { extractComments: false, charset: false }
		},
		minimizer: ["..."]
	},
	experiments: {
		css: true
	}
};
