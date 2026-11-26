"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		"@scope/app": "./index.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "chunks/[name].js"
	}
};
