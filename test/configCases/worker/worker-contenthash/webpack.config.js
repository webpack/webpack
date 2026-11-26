"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		main: {
			import: "./index.js",
			filename: "[name].js"
		}
	},
	output: {
		filename: "[name]-[contenthash].js",
		environment: {
			nodePrefixForCoreModules: false
		}
	}
};
