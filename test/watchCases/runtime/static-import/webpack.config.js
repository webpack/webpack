"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	optimization: {
		runtimeChunk: true
	}
};
