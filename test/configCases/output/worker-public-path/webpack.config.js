"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "none",
	target: "node",
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		filename: "[name].js",
		workerPublicPath: "/workerPublicPath2/"
	}
};
