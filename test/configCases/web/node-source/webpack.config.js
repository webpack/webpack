"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	entry: "./index.mjs",
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};
