"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		bundle0: {
			import: "./index.js",
			baseUri: "my-scheme://baseuri",
			publicPath: "/"
		}
	},
	output: {
		assetModuleFilename: "[name][ext]"
	},
	target: "web"
};
