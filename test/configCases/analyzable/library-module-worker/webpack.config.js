"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	output: {
		module: true,
		library: { type: "module" },
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	}
};
