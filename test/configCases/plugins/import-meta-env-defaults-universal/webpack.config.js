"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: ["web", "node"],
	output: {
		module: true,
		filename: "bundle.mjs"
	},
	optimization: {
		minimize: false
	}
};
