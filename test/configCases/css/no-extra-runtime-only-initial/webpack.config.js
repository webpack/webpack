"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	devtool: false,
	mode: "production",
	target: "web",
	optimization: {
		minimize: false
	},
	experiments: {
		css: true
	}
};
