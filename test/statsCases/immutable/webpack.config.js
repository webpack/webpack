"use strict";

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	output: {
		filename: "[contenthash].js"
	},
	stats: {
		all: false,
		assets: true
	}
};
